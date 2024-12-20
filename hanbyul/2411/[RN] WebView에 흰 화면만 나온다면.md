## 0. 들어가며

우선 어그로성 제목에 대해 사과의 말씀을 드린다.

제목은 마치 모든 WebView의 흰 화면 이슈를 해결할 수 있는 것처럼 써놓았지만, 특정한 개발 환경에서만 일어날 수 있는 이슈이기에 가볍게 참고용으로만 봐주면 좋겠다.

추가적으로 이슈 원인과 해결 방안만 보고 싶은 분들은 [1. 이슈설명](#1-이슈-설명) 부분과 [3.해결방안](#3-해결-방안) 부분만 보면 된다.

## 1. 이슈 설명

우선 내가 사용한 React-Native(EXPO)의 package.json은 다음과 같다.

```json
{
  "name": "app",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "^52.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.2",
    "react-native-webview": "13.12.2"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~18.3.12",
    "typescript": "^5.3.3"
  },
  "private": true
}
```

`$ npx creat-expo-app@latest`를 활용해 만든 매우 기본적인 RN 스켈레톤 코드다.

최초의 App.tsx도 다음과 같은 형태였다.

```tsx
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export default function App() {
  return (
    <View style={styles.container}>
      <WebView
        style={styles.webview}
        source={{ uri: "https://example.app/" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
```

`uri` 값에 'https://google.com'을 넣어줄 경우 다음과 같은 화면이 뜬다.

![](https://velog.velcdn.com/images/hayou/post/afa6d264-1378-4303-918f-653e03454469/image.PNG)

하지만, 정작 내가 실제로 웹뷰로 띄우고자 하는 웹페이지의 주소를 넣을 경우 다음과 같이 흰 화면이 노출되었다.

![](https://velog.velcdn.com/images/hayou/post/6bc685ea-09c0-47e8-af09-265b71f55059/image.PNG)

해당 프로젝트는 `Vite` + `React` + `Typescript` 기반의 프로젝트로, `Vercel`을 활용해 배포되어있던 상태였다.

## 2. 문제의 원인 찾기

우선 흰 화면이 나와도 아무런 에러 로그가 찍히지 않았다.

```ts
  onError={(event) => {
    console.error("WebView error:", event.nativeEvent);
    Alert.alert("오류 발생", "웹뷰 로딩 중 오류가 발생했습니다!");
  }}
  onHttpError={(syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error("HTTP error:", nativeEvent);
    Alert.alert("오류 발생", "웹뷰 로딩 중 오류가 발생했습니다!");
  }}
```

이러한 옵션을 추가해주어도 콘솔창에는 아무것도, 하다 못해 Expo 앱에 Alert 조차 뜨지 않았다.
(디버깅 콘솔창에서 `window.alert('Hello World!')`와 같은 명령어가 정상적으로 동작하는 것은 확인된 상황)

### 2-1. 배포 플랫폼의 문제일까?

혹시나 Vercel의 문제일까 하여 구글링을 시작했다. Vercel로 배포된 페이지를 React-Native WebView로 띄운 블로그들을 살펴보았다.

당연히도 많은 블로거들의 프로젝트는 이슈 없이 정상적으로 동작하는 것으로 보였다.

그래도 혹시나 하는 마음에 Vercel에 업로드 되어있던 프로젝트를 Netlify로 옮겨서 배포해보았다.

여전히 같은 이슈가 발생하는 것을 확인하고, 다른 방안을 강구해보았다.

### 2-2. 빌드의 문제일까?

당시 내가 Vercel에 띄워놓은 프로젝트는 모두 Vite+React 기반의 프로젝트였다.

이에 눈을 돌려 `Vite`의 이슈는 아닐까 하고 검색을 시작했다.

얼마 지나지않아 천금과 같은 글을 발견하였다.

바로 우아한형제들의 기술블로그에서 작성한 [Vite로 구버전 브라우저 지원하기](https://techblog.woowahan.com/17710/) 글이었다.

함께 문제를 해결해주던 동료분도 "WebView는 브라우저 버전을 많이 탄다."는 조언을 해주었고, 희망을 품고 새로운 시도를 해보았다.

```ts
// vite.config.js
import legacy from "@vitejs/plugin-legacy";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    legacy({
      targets: ["chrome >= 64", "safari >= 12"],
      modernPolyfills: ["es.object.from-entries"],
    }),
  ],
});
```

하지만 여전히 동작하지 않았다. 또다시 다른 방법을 찾아야만 했다.

이외에도 다양한 시도를 해보았다. 라우팅 문제인가 하여 `vite.config.js`에 `base: '/'` 옵션을 넣어보기도, `index.html`에 `<base href="/" />`를 추가해보기도 하였다.

모든 방안에 실패한 뒤, 기존 `Next.js`로 작성되어있던 프로젝트를 Vercel에 배포하고 웹뷰에 띄워보았다.

![](https://velog.velcdn.com/images/hayou/post/ab91effd-03ab-4f3c-b3c4-fcb988b1dda7/image.PNG)

오? 비록 지도가 띄워지지는 않았지만 몇몇 리소스들이 떠있는 것을 보고 희망을 품기 시작하였다.

아무튼 Vite 빌드가 잘못됐다는 생각을 가지고 CRA 기반의 기본 프로젝트를 만들어 Vercel 배포를 진행했다.

![](https://velog.velcdn.com/images/hayou/post/0d20c5f1-59aa-4655-8bf7-b2345983cf42/image.jpeg)

기존 프로젝트와는 달리 실마리를 주기 시작하였다.

### 2-3. WebView 설정의 문제일까?

드디어 끝이 보이는 줄 알았다.

바로 `WebView` 옵션 중 `javaScriptEnabled` 옵션이 있었기 때문이다.

`javaScriptEnabled={true}` 옵션을 추가해주고 reload를 했다...

하지만 아무것도 변한건 없었다.

그러던 중 저 문구가 너무 위에 붙어있는 것 같아서 영역을 구분해주기 위해 간단한 `<Text>` 요소를 추가해주려고 했다. (스크린샷은 일부러 내려서 찍은 것이다. 아직 `SafeAreaView` 적용을 안해놨다.)

```ts
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export default function App() {

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Hello World!</Text>
      <WebView
        style={styles.webview}
        source={{ uri: "https://example.app/" }}
      />
    </View>
  );
}
```

엥, `<Text/>` 요소를 추가하고 저장하자 비로소 웹뷰에 내가 원하던 페이지가 띄워지는게 아닌가?

즉, DOM을 직접 건드려 Rerender가 이루어졌을 때 WebView가 제대로 동작하는 것이었다.

그래서 WebView의 생명주기, 혹은 내부 Javascript 동작 타이밍 이슈임을 확신하고 Github 이슈들을 살펴보기 시작했다.

## 3. 해결 방안

정확히 3일 전에 나와 같은 이슈를 겪은 개발자의 글을 찾을 수 있었다.

[WebView displays 'JavaScript not enabled' error on first load (iOS only)](https://github.com/react-native-webview/react-native-webview/issues/3616)

역시 고수 형님들이 해결 방안을 우루루 적어놓으셨고, 그 중 가장 마음에 드는 놈으로 골라 적용해보았다.

[Comment 확인](https://github.com/react-native-webview/react-native-webview/issues/3616#issuecomment-2494300117)

```ts

  const [ready, setReady] = useState(false);
  const [webkey, setWebkey] = useState(0);

  return (
    ...
    <WebView
      source={{ uri: "https:// ... " }}
      key={webkey}
      onLoadStart={(e) => {
        const { nativeEvent } = e;
        if (nativeEvent.url === "about:blank" && !ready) {
          setWebkey(Date.now());
        }
      }}
      onLoadEnd={() => {
        if (!ready) {
          setWebkey(Date.now());
          setReady(true);
        }
      }}
      ...
    />
  )
```

> 코드 설명

- 초기 로드시 `WebView`가 `about:blank`를 로드할 경우, `key`를 갱신하여 `WebView`를 재렌더링
- `WebView`가 로드를 마치면 `onLoadEnd` 호출
- `ready` 상태를 확인하여, 준비되지 않았을 경우 다시 `key`를 갱신하여 `WebView`를 재렌더링
- 정상 상태일 경우(`ready`가 `true`인 이후)에는 `onLoadStart`와 `onLoadEnd`에서 추가적인 `key` 변경 작업 X

**제대로 동작한다...!!**

![](https://velog.velcdn.com/images/hayou/post/74c9e013-4ec6-4d37-8602-6ac51f030269/image.PNG)

## 4. 마무리

이렇게 간단한 문제를 거의 사흘 밤낮을 고민했었다.

하지만 이 과정에서 많은 것을 느낄 수 있었다.

그동안 문제 해결을 위해 너무 AI툴에 의존하고 있었던 것은 아닌지.

공식 문서를 찾아보고, Github에 작성된 이슈들을 보며 동료 개발자들의 고민을 읽으며 해결 방안을 찾는 것의 중요성을 다시금 느낄 수 있었다.
