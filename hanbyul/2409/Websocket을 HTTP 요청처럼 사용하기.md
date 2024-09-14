### 0. 들어가며

아무도 관심 없을 내용일듯하다.

과거 사내에서 WebSocket API를 활용한 프로젝트를 진행하면서, 프론트엔드에서 WebSocket 요청을 마치 `Axios`와 같은 비동기 처리 로직으로 다룰 수 있는 방법을 고민했었다.

WebSocket은 실시간 데이터 통신에 유리하지만, 일반적인 HTTP 요청과 달리 연결 상태 관리나 메시지 처리 방식이 다소 복잡하여 개발자가 직접 구현하기엔 번거로운 부분이 많다.

이에 따라, WebSocket을 보다 쉽게 다룰 수 있는 `FetchWS` 클래스를 작성하게 되었다.

이 클래스는 WebSocket 연결 관리와 메시지 송수신을 효과적으로 처리할 수 있도록 설계되었으며, 비동기 통신을 직관적으로 사용할 수 있도록 돕는다.

이 글에서는 `FetchWS` 클래스의 구조와 주요 메서드들을 살펴보고, 실제 적용 시 유용한 부분을 설명해본다.

---

### 1. 클래스 정의

우선 WebSocket 인스턴스를 다루기 위한 여러 메서드를 제공하는 클래스(나는 `FetchWS`라 명명하였다)를 하나 만들자.

```ts
class FetchWS {
  private socket: WebSocket | null = null;
  private key: number = 0;
```

- `socket`: WebSocket 인스턴스를 담는 변수로, null로 초기화되어 연결이 수립되지 않았을 때를 명시한다.

- `key`: 고유한 메시지 키를 생성하기 위한 변수로, 매 메시지 전송 시마다 증가한다.

이렇게 클래스 내에서 WebSocket 연결 상태를 관리하며, 연결 및 메시지 송수신에 필요한 메서드를 정의한다.

---

### 2. 필수 메서드: 연결 관리 및 상태 확인

`FetchWS` 클래스는 WebSocket 연결을 관리하기 위해 `connect`, `cleanUp`, `isConnected` 메서드를 제공한다.

#### 2-1. `connect(socketAddress: string): Promise<void>`

WebSocket 연결을 설정하는 메서드이다.

주어진 주소로 연결을 시도하고, 성공적으로 연결되면 resolve를 호출하여 연결 성공을 알린다.

오류가 발생하면 reject로 실패를 처리한다.

```ts
connect(socketAddress: string): Promise<void> {
  return new Promise((resolve, reject) => {
    this.socket = new WebSocket(socketAddress);

    this.socket.onopen = () => {
      resolve();
    };

    this.socket.onerror = () => {
      reject(new Error("Failed to connect"));
    };
  });
}
```

- `onopen`: WebSocket이 성공적으로 열렸을 때 호출한다.

- `onerror`: 연결이 실패할 경우, 에러 메시지와 함께 `reject`한다.

#### 2-2. `cleanUp()`

WebSocket 연결을 정리하는 메서드이다.

연결을 안전하게 종료하고, 내부의 socket을 null로 설정하여 다음 연결에 대비한다.

```ts
cleanUp() {
  if (this.socket) {
    this.socket.close();
    this.socket = null;
  }
}
```

#### 2-3. `isConnected(): boolean`

현재 WebSocket의 연결 상태를 확인하는 메서드로, 연결이 유실되었는지 확인한다.

연결 상태에 따라 true 또는 false를 반환하며, 연결이 유실되었을 때에는 콘솔에 에러 메시지를 출력한다(옵셔널).

```ts
isConnected(): boolean {
  if (
    this.socket === null ||
    this.socket.readyState === WebSocket.CONNECTING ||
    this.socket.readyState === WebSocket.CLOSED ||
    this.socket.readyState === WebSocket.CLOSING
  ) {
    console.error(`소켓 연결이 유실되었습니다: ${this.socket?.readyState}`);
    return false;
  }
  return true;
}
```

---

### 3. 메시지 전송 및 응답

`sendMessage` 메서드는 WebSocket을 통해 메시지를 전송하고, 응답 메시지를 처리하는 핵심 메서드이다.

이 메서드는 JSON 형식의 메시지를 전송하며, 특정 메시지 키를 사용하여 올바른 응답을 처리한다.

#### `sendMessage<T>(header: ReqHeader, body: ReqBody): Promise<T>`

```ts
async sendMessage<T>(header: ReqHeader, body: ReqBody): Promise<T> {
  if (!this.isConnected()) {
    return Promise.reject(new Error("소켓 연결이 유실되었습니다."));
  }

  // messageKey를 고유하게 생성
  const messageKey = `message-${++this.key}`;
  const message = JSON.stringify({ header: { ...header, messageKey }, body });
  console.log("Sending message with key:", messageKey);

  return new Promise((resolve, reject) => {
    // onmessage를 Promise 내부에서 처리
    const handleMessage = (messageEvent: MessageEvent) => {
      try {
        const data = messageEvent.data;

        // 수신된 데이터가 문자열인 경우 JSON 파싱 시도
        const response: ResMeta = JSON.parse(data);

        // 해당 response의 messageKey가 일치하는지 확인 후 처리
        if (response.messageKey === messageKey) {
          if (response.result !== "SUCCESS") {
            reject(new Error(response.message));
          } else {
            resolve(response as T);
          }
          // 이벤트 리스너 제거
          this.socket!.removeEventListener("message", handleMessage);
        }
      } catch (error) {
        reject(new Error(`Failed to process received message: ${error}`));
      }
    };

    // 이벤트 리스너 등록
    this.socket!.addEventListener("message", handleMessage);

    // 메시지 전송
    this.socket!.send(message);
  });
}
```

- 메시지 전송 전, isConnected 메서드를 통해 연결 상태를 확인한다.

- 고유한 messageKey를 생성하여 전송할 메시지에 포함시킨다.

- 응답 메시지를 처리하는 handleMessage 이벤트 리스너를 등록하여, 수신된 메시지가 기대하는 messageKey와 일치할 때만 처리를 진행한다.

- 메시지 처리 완료 후, 이벤트 리스너를 제거하여 메모리 누수를 방지한다.

---

### 4. 마치며

이번 글에서는 WebSocket 통신을 쉽게 관리하고, 비동기 요청처럼 다룰 수 있도록 설계한 FetchWS 클래스를 소개했다.

사실 이 클래스는 기본적인 구조만 보여주기 위해 간략하게 작성한 코드이다. 실제 사내에서는 이 구조를 바탕으로 바이너리 타입에 직접 프로토콜 헤더를 넣고, 디코딩까지 할 수 있는 라이브러리로 발전시켰다.

나처럼 WebSocket을 다뤄야 하는 비슷한 상황에 처한 분들에게 이 글이 조금이라도 도움이 되었으면 좋겠다.
