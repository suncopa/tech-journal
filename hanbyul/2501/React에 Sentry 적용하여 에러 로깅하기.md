## 0. 들어가며

프로젝트가 온실 속 화초 같은 dev 환경을 떠나, 거친 풍파의 prod 환경으로 뛰어들었다.
그와 함께 뒤따라온 문제는 바로 **에러 핸들링의 어려움**이었다.

로컬 환경에서는 문제없이 동작했지만, 사용자들로부터 에러 관련 문의가 끊이지 않았다. 특히 WebView로 React 애플리케이션을 띄운 구조라, 에러가 어디서 발생했는지 파악하고 대응하는 일이 더욱 어려웠다.

이 문제를 해결하기 위해 Sentry를 도입했고, 이를 통해 프로덕션 환경에서도 에러를 효과적으로 추적하고 핸들링할 수 있는 시스템을 구축했다.

이 글에서는 React 프로젝트에서 Sentry를 적용한 과정을 단계별로 정리하며, 적용 후 느낀 점도 함께 공유하고자 한다.

## 1. Sentry란?

Sentry는 애플리케이션에서 발생하는 에러를 추적하고 해결을 돕는 도구이다.
단순히 에러를 기록하는 것에 그치지 않고, 문제를 발견, 분석, 해결하는 데 필요한 다양한 기능을 제공한다.

### 🚀 주요 기능

![](https://velog.velcdn.com/images/hayou/post/f15b03fb-ce5e-461e-9e33-c5fa363e8e9c/image.png)

> 1. Error Monitoring

- 에러 발생 시 실시간으로 모니터링 가능
- 영향을 받은 사용자 수를 기준으로 우선순위를 정할 수 있는 기능 제공

> 2. Tracing

- 분산된 시스템에서 데이터가 흐르는 전체 경로를 추적
- 정확한 문제 지점을 찾기 위한 엔드 투 엔드(End-to-End) 추적 가능
- 관련 메트릭, 특정 이슈, 검색 결과에서 트레이스로 이동 가능

> 3. Session Replay

- 사용자 환경에서 발생한 문제를 시각적으로 분석
- 애플리케이션의 콘솔 출력, 네트워크 호출, DOM 트리 확인 가능
- 브라우저 개발자 도구와 유사한 방식으로 문제를 분석

> 4. Code Coverage

- 테스트 커버리지 정보를 PR과 연동하여 코드 품질 유지 가능
- PR에서 바로 커버리지 정보를 확인하며 코드 리스크 분석

### 💻 React 프로젝트에서 Sentry를 사용하는 이유

React는 컴포넌트 기반 구조로 설계되어 있어, 특정 컴포넌트에서 발생한 에러가 예상치 못하게 전체 애플리케이션에 영향을 미칠 수 있다.

특히 비동기 코드 실행 중 발생하는 에러는 전파 경로나 원인을 분석하기 어려워 이를 효과적으로 파악하고 해결할 수 있는 도구가 필요하다. Sentry는 이러한 문제를 해결하기 위한 강력한 도구로, 에러 발생 위치와 함께 브라우저 환경, 네트워크 상태 등 다양한 문맥 정보를 제공한다.

이를 통해 React 프로젝트에서 복잡한 에러를 더 쉽게 관리하고, 문제를 재현하며 해결할 수 있다.

## 2. 코드에 적용하기

Sentry를 React 프로젝트에 적용하기 위해 @sentry/react와 @sentry/vite-plugin 두 가지 패키지를 사용했다.

### 2-1. 설치 및 Vite 플러그인 설정

먼저 패키지를 설치한다.

`$ npm install @sentry/react @sentry/vite-plugin`

설치 후, vite.config.ts 파일에서 Sentry Vite 플러그인을 설정한다.

```ts
import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: "Sentry-Organization-Slug", // Sentry 조직명
      project: "Sentry-Project-Name", // Sentry 프로젝트명
    }),
  ],

  build: {
    sourcemap: true, // Sentry에 소스맵 업로드를 위해 필요
  },
});
```

이 때, build.sourcemap을 반드시 true로 설정해야 Sentry가 에러 스택 트레이스를 정확히 분석할 수 있다.

### 2-2. Sentry 초기화

Sentry를 초기화하려면 진입점 파일(예: `main.tsx`)에서 `Sentry.init()`을 호출한다.

```tsx
// main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://f956924d307031f7f16ab6f58dbe8538@o4508425511567360.ingest.us.sentry.io/4508425513074688',
  integrations: [],
});

createRoot(document.getElementById('root')!).render(
  ...
  	<App />
  ...
);
```

- dsn은 Sentry 프로젝트 설정에서 확인 가능
- integrations는 기본값을 사용하지 않을 경우에만 설정 필요

### 2-3. ErrorBoundary와 비동기 에러 처리

React에서 발생한 에러는 기본적으로 전체 컴포넌트 트리로 전파되어 애플리케이션이 중단될 수 있다.
이를 방지하고 사용자에게 적절한 피드백을 제공하기 위해 `ErrorBoundary` 설정이 필요하다.
Sentry의 `ErrorBoundary`는 에러를 감지하고 이를 Sentry 대시보드로 자동 보고한다.

```tsx
import * as Sentry from "@sentry/react";
import React, { Suspense } from "react";

const ErrorFallback = ({
  error,
  resetError,
}: {
  error: unknown;
  resetError: () => void;
}) => {
  resetError();
  return null; // Fallback 컴포넌트
};

function FetchBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} resetError={resetError} />
      )}
      onError={(error) => Sentry.captureException(error)}
    >
      <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
    </Sentry.ErrorBoundary>
  );
}

export default FetchBoundary;
```

하지만, 비동기 요청(예: API 요청)에서 발생한 에러는 기본적으로 감지되지 않으므로 직접 처리해야 한다.
`throwOnError: true`를 설정하면 API 요청 에러를 ErrorBoundary로 전파할 수 있다.

```ts
const useExampleQuery = (props: unknown) => {
  return useQuery({
    queryKey: ["example", props],
    queryFn: () => fetchAPI(props),
    enabled: !!props,
    throwOnError: true, // 에러를 ErrorBoundary로 전파
  });
};
```

### 2-4. 테스트 및 디버깅

설정을 완료했다면, 다음 코드를 추가해 Sentry 이벤트가 정상적으로 기록되는지 확인해볼 수 있다:

```tsx
Sentry.captureMessage("Test message from React app!");
```

또한, 의도적으로 에러를 발생시켜 ErrorBoundary와 Sentry가 제대로 작동하는지 검증해볼 수도 있다.

```tsx
<button
  onClick={() => {
    throw new Error("Test error");
  }}
>
  Throw Error
</button>
```

이렇게 에러가 발생하면 Sentry 대시보드에 다음과 같이 에러가 기록된다.

![](https://velog.velcdn.com/images/hayou/post/2d7c7ac2-fbc5-416e-80b5-77060ef0b5be/image.png)

Sentry는 기록된 에러를 이메일, Slack 등 다양한 수단을 통해 팀원들에게 실시간으로 알릴 수 있어 빠른 대응을 도울 수 있다.

## 3. 마무리하며

프로덕션 환경에서의 에러는 사용자 경험과 서비스 품질에 직접적인 영향을 미친다. 특히, 디버깅이 어려운 환경에서는 에러를 빠르게 감지하고 정확히 파악하는 시스템이 필수적이라고 생각한다.

Sentry는 React 애플리케이션에서 발생하는 에러를 자동으로 감지하고, 대시보드를 통해 직관적으로 관리할 수 있는 강력한 도구다. 이를 통해 개발자는 문제의 원인을 빠르게 파악하고 대응할 수 있으며, 사용자 경험을 한층 더 개선할 수 있다.

이번 경험은 단순한 설정 과정을 넘어, 에러를 체계적으로 관리하는 시스템의 중요성을 다시금 느끼는 계기가 되었다. 대시보드에 기록된 에러를 확인하며 그동안 막연했던 문제들이 명확히 드러나는 것을 보고 큰 만족감을 느낄 수 있었다.

![](https://velog.velcdn.com/images/hayou/post/6e436c44-16a5-4257-ad7f-9b24e0f39c9a/image.png)
