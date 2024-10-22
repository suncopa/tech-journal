### 0. 들어가며

지난 달 Toss에서 개최한 [Slash24에서 다양한 세션을 들었다](https://velog.io/@hayou/Slash24에-다녀왔습니다-feat.-Toss).

그 중 가장 기억에 남았던 세션을 토대로, 실제 프로젝트에 적용해보고자 공부를 시작했다.

바로 **N개의 탭에서 Shared Worker를 활용해 1개의 웹소켓으로 통신**하는 내용이다.

아마 [과거의 글](https://velog.io/@hayou/Slash24에-다녀왔습니다-feat.-Toss)을 읽어보신 분들은 아시겠지만, 우리 회사에서는 api 요청을 위해 ws 기반 프로토콜을 사용하고 있다.

### 1. 왜 필요할까?

그렇다면 해당 기술이 왜 필요한걸까?

크로미움 기반의 브라우저는 각 탭 또는 웹 페이지를 별도의 프로세스로 실행한다.

그렇기 때문에 각 탭마다 서버와 webSocket connection을 맺을 경우, 서버에 과도한 부하가 걸릴 수 있게된다.

![](https://velog.velcdn.com/images/hayou/post/4180abe3-235a-4646-b155-2793fab2f272/image.png)

이처럼 N개의 탭마다 webSocket connection을 맺는 것이 아닌, 브라우저 별로 webSocket connection을 맺게된다면 서버의 부하를 줄일 수 있게 된다.

![](https://velog.velcdn.com/images/hayou/post/bbc5f069-01d3-4b0b-bce8-10066597dd2b/image.png)

### 2. SharedWorker를 활용한 webSocket 통신 아키텍처

다음은 실제 구현을 위한 아키텍처를 살펴보자.

이는 필자의 기존 프로젝트 구조, 취향 등에 맞춰 설계한 것임으로 감안하고 보시길..

![](https://velog.velcdn.com/images/hayou/post/a3082dad-4605-4070-804c-d9732b54846a/image.png)

뒤에서 나올 코드들은 실제 프로젝트에 적용한 코드가 아닌 학습을 위해 localHost에서 작성한 코드이다.

대략적인 구조를 파악하는데에만 사용하길 바란다.

#### 2-1. useSharedWorker

이 훅은 전역에서 sharedWorker에 접근하기 용이하게 만들기 위한 커스텀 훅이다.

`useSharedWorker` 훅은 SharedWorker 객체 및 webSocket connection 관리, message 비동기 처리 등의 역할을 한다.

```ts
// useSharedWorker.ts


interface UseSharedWorkerReturn {
  connectWebSocket: (socketAddress: string) => Promise<void>;
  disconnectWebSocket: () => void;
  sendMessage: <T>(header: ReqHeader, body: ReqBody) => Promise<T>;
  webSocketStatus: string;
  error: string | null;
}

export const useSharedWorker = (): UseSharedWorkerReturn => {
  const sharedWorkerUrl = new URL("/sharedWorker.js", import.meta.url);
  const workerRef = useRef<SharedWorker | null>(null);
  const [webSocketStatus, setWebSocketStatus] =
    useState<string>("disconnected");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sharedWorker = new SharedWorker(sharedWorkerUrl);
    workerRef.current = sharedWorker;

    // SharedWorker로부터 메시지 수신
    sharedWorker.port.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case "STATUS":
          setWebSocketStatus(data);
          break;
        case "ERROR":
          setError(data);
          break;
        case "RESPONSE":
          break;
        default:
          console.warn(`Unknown message type: ${type}`);
      }
    };

    return () => {
      sharedWorker.port.close();
    };
  }, []);

  const connectWebSocket = useCallback(
    (socketAddress: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        workerRef.current?.port.postMessage({
          type: "CONNECT",
          data: { socketAddress },
        });
        resolve();
      });
    },
    []
  );

  const disconnectWebSocket = useCallback(() => {
    workerRef.current?.port.postMessage({ type: "DISCONNECT" });
    setWebSocketStatus("disconnected");
  }, []);

  const sendMessage = useCallback(
    <T>(header: ReqHeader, body: ReqBody): Promise<T> => {
      return new Promise((resolve, reject) => {
        workerRef.current?.port.postMessage({
          type: "SEND_MESSAGE",
          data: { header, body },
        });

        // Handle the promise resolving when a response comes back
        const handleResponse = (event: MessageEvent) => {
          const { type, data } = event.data;
          if (type === "RESPONSE") {
            resolve(data);
          } else {
            reject(new Error("Unexpected message type"));
          }
        };

        workerRef.current?.port.addEventListener("message", handleResponse);
      });
    },
    []
  );
```

#### 2-2. App (혹은 hook을 사용할 컴포넌트)

컴포넌트에서는 그저 useSharedWorker를 불러와 사용하면 된다.

```ts
// App.tsx

const App: React.FC = () => {
  const {
    connectWebSocket,
    disconnectWebSocket,
    sendMessage,
    webSocketStatus,
  } = useSharedWorker();

  const [responses, setResponses] = useState<string[]>([]);

  // WebSocket 연결 함수
  const handleConnect = async () => {
    try {
      await connectWebSocket("wss://localhost:8080");
      console.log("Connected to WebSocket server.");
    } catch (error) {
      console.error(error);
      alert("Failed to connect to WebSocket server.");
    }
  };

  // WebSocket 연결 해제 함수
  const handleDisconnect = () => {
    disconnectWebSocket();
  };

  // 버튼 클릭 시 API 요청 트리거
  const handleSendRequest = async () => {
    try {
      const response = await sendMessage(
        {
          targetServiceName: "TestService",
          messageType: "REQUEST",
          contentType: "TEXT",
          requestId: Date.now(),
        },
        { data: "Sample data from client" }
      );

      setResponses((prevResponses) => [
        ...prevResponses,
        JSON.stringify(response),
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (...);
};
```

#### 2-3. SharedWorker

가장 중요한 SharedWorker.js 코드이다.

사실 거창하게 시작했지만 self, messagePort 등에 익숙하다면 별로 낯설지 않을 것이다.

또한 후에 서술하겠지만 완전히 완성한 코드(메모리 누수 이슈 미해결)가 아니라서 감안하고 보면 좋을 듯하다.

```js
// public/sharedWorker.js

class FetchWS {
  ...
}

const sharedFetchWS = new FetchWS();
const connections = {}; // { clientId: port }

self.onconnect = (event) => {
  const port = event.ports[0];
  const clientId = `client-${Date.now()}`;
  connections[clientId] = port;

  port.postMessage({
    type: "CONNECTED",
    data: { message: "WebSocket connected", clientId },
  });

  port.onmessage = async (event) => {
    const { type, data } = event.data;

    switch (type) {
      case "CONNECT":
        if (sharedFetchWS.isConnected()) {
          port.postMessage({ type: "STATUS", data: "connected" });
          return;
        }
        await sharedFetchWS.connect(data.socketAddress);
        port.postMessage({ type: "STATUS", data: "connected" });
        sharedFetchWS.setOnMessageHandler((event) => {
          const response = JSON.parse(event.data);
          Object.values(connections).forEach((p) => {
            p.postMessage({ type: "RESPONSE", data: response });
          });
        });
        break;

      case "SEND_MESSAGE":
        if (sharedFetchWS.isConnected()) {
          const message = JSON.stringify({ ...data, clientId });
          sharedFetchWS.sendMessage(message);
        }
        break;

      case "DISCONNECT":
        sharedFetchWS.socket.close();
        delete connections[clientId];
        port.postMessage({ type: "STATUS", data: "disconnected" });
        break;

      default:
        port.postMessage({ type: "ERROR", data: "Unknown message type" });
    }
  };

  port.start();
};
```

### 3. 여러 이슈들

사실 하루 이틀이면 끝날 줄 알았던 내용이었는데, 생각보다 많은 이슈가 있어서 꽤 오랜 시간을 투자했다.

혹시나 webWorker, sharedWorker가 처음이라면 나와 같은 실수를 할 수 있으니 이 글이 조금이나마 도움이 되면 좋겠다.

또한 이슈에 대한 깊이있는 공부보다 구현이 우선이었어서, 잘못된 정보가 있을 수도 있고 너무 얕은 수준의 내용일 수도 있으니 감안해서 보길 바란다.

(잘못된 정보가 있으면 댓글 남겨주세요...ㅠ)

#### 3-1. SharedWorker가 안읽어져요

기존 CRA로 만들어놓은 localHost에서 실행을 해보는데, sharedWorker.js를 읽어오지 못하는 이슈가 있었다.

검색을 통해 번들링 문제임을 알게 되었다. _(아닐 수도 있습니다)_

CRA 환경에서는 webpack 설정을 기본적으로 제한하고 있기 때문에 직접 명령어를 통해 webpack 설정을 수정하거나 별도의 라이브러리의 도움을 받아야 했다.

라이브러리 의존성을 추가로 만들고 싶지 않아 다른 방법을 알아보던 중, `vite`의 경우 손쉽게 불러올 수 있다는 정보를 얻었다.

```js
export default defineConfig({
  plugins: [react()],
  publicDir: "public", // 기본값은 'public'입니다. 생략 가능
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "cert.pem")),
    },
    port: 5173, // 기본 포트를 사용하거나 원하는 포트로 변경
  },
  build: {...},
  worker: {
    format: "es",
  },
});
```

> typescript 파일은 안될까요?

- 브라우저가 sharedWorker 코드를 직접 불러와서 js 파일을 실행하는 방식이기 때문에, ts 파일의 경우 트랜스파일링 없이 브라우저가 읽을 수 없기 때문에 typescript 파일이 아닌 javascript 파일로 생성해야 한다.

> public 디렉토리에 넣는 이유는 뭘까요?

- 브라우저에서 직접 읽어오기 위해 public 디렉토리에 넣어야 한다.
- src 하위에 해당 파일을 넣을 경우, 번들링에 의해 이름이 변경될 수 있다.
- 서로 다른 이름의 sharedWorker는 각자 새로운 sharedWorker를 생성한다.

#### 3-2. 디버깅이 너무 어려워요

SharedWorker.js 내부의 console.log나 연결된 network 정보는 각 앱의 콘솔창, network 창에서 확인할 수 없다.

하지만 chrome에는 갓기능이 있으니, 바로 chrome devtool이다.

![](https://velog.velcdn.com/images/hayou/post/2f84b3a2-2323-41c8-823b-ebee6412ab00/image.png)

chrome://inspect/#workers 에 접속하면 현재 사용 중인 worker들을 한 눈에 볼 수 있고, terminate를 통해 worker를 종료시키거나 inspect를 통해 자세한 정보를 볼 수 있다.

![](https://velog.velcdn.com/images/hayou/post/2f5c641b-8440-4c74-8c4a-9f2910a4c3a9/image.png)

#### 3-3. port 관리가 어려워요

기존 코드는 `self.onconnect`시 port를 열고, 해당 이벤트 내부에서만 port 관리를 해주었다.

그러다보니 가장 마지막에 연결된 port에만 메시지를 쏘는 이슈가 있었다.

이를 해결하기 위해 `sharedWorker.js`에 전역 변수로 object를 하나 만들었다.

`onconnect`시 clientId를 생성해주고, 해당 전역 변수에 key-value로 clientId-port를 넣어 관리해주었다.

이를 활용해 message 요청시 cliendId에 맞는 port에만 message를 요청하게 변경하였고, 제대로 동작함을 확인하였다.

### 4. 미해결 이슈

사실 localHost에서는 이정도만 돌아가는 것을 확인하고 기존 프로젝트에 적용을 하였다.

하지만 프로젝트에서 사용해보니 새로운 이슈를 발견했는데, 바로 메모리 누수 이슈였다.

port 연결이 끊어져도 해당 이벤트를 감지하지 못하고, webSocket 연결을 유지하는 등의 이슈가 발생한 것이다.

토스도 같은 이슈를 경험하였고, 해당 이슈를 해결하기 위해 `weakRef`라는 개념을 도입했다고 지난 발표에서 말했다.

이 힌트를 바탕으로 해당 이슈를 해결하고, `weakRef`에 대해 학습하는 경험을 다음 글로 남기고자 한다.

### 5. 마치며

세션을 들을 때만 해도 금방 끝날 줄 알았던 프로젝트였는데, 생각보다 많은 이슈와 싸워야했다.

머릿속에 개념으로만 있던 내용을 직접 코드로 구현해보며 직접 이슈들과 맞서 싸워보는 경험이 중요하다는 것을 다시 한번 느낄 수 있었다.

또한 추가적으로 여러 컨퍼런스에 다니며 이런 새로운 내용들을 더 듣고싶다는 열망이 커지는 계기가 되었다.

(카카오if, 당근 테크 밋업, 인프런 퇴근길 밋업 다 떨어져서 슬픈 사람이 바로 나에요)
