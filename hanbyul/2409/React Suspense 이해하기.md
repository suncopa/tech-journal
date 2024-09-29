## 0. 들어가며

사용자 경험을 향상시키기 위해 데이터 처리 과정을 시각화하는 것은 필수적이다.

특히, 이를 구현하는 데 핵심적인 역할을 하는 `<Suspense>`와 `Error Boundary`에 대한 이해는 점점 더 중요해지고 있다.

최근 리액트 공식문서의 컴포넌트 챕터를 공부하면서 이러한 개념들을 한층 깊이 있게 탐구하게 되었고, 이를 통해 데이터 로딩을 보다 안정적이고 효율적으로 처리하는 방법을 고민할 수 있었다.

## 1. Suspense 기본 개념

React v18과 함께 많은 이들이 기다려왔던 `<Suspense>` 기능이 추가되었다.

`<Suspense>`는 콘텐츠가 로드되기 전까지 사용자에게 대체 UI(`fallback`)를 제공하는 컴포넌트로, 비동기적 로딩을 처리할 때 매우 유용하다.

### 컴포넌트 로드에 활용되는 `<Suspense>`

`<Suspense>`는 주로 비동기적으로 컴포넌트를 로드할 때 사용된다.

예를 들어 React.lazy를 활용해 컴포넌트를 지연 로드하고, 그 사이에 `fallback` UI를 표시할 수 있다.

> 컴포넌트 로딩 예시

```js
import React, { Suspense } from "react";

const MyComponent = React.lazy(() => import("./MyComponent"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyComponent />
    </Suspense>
  );
}

export default App;
```

위 코드에서는 MyComponent를 비동기적으로 로드하며, 로딩 중에는 'Loading...' 메시지가 화면에 표시된다.

### 데이터 패칭에 적용된 `<Suspense>`

뿐만 아니라, <Suspense>는 데이터를 비동기적으로 받아올 때도 유용하다.

데이터를 패칭하는 동안 `fallback` UI를 표시하는 방식으로 사용자 경험을 향상시킬 수 있다.

**React Query와의 통합**

많은 개발자들이 사용하는 react-query는 `suspense` 옵션을 통해 `<Suspense>`와 자연스럽게 결합할 수 있다.

이를 통해 별도의 상태 관리 없이도 비동기 작업을 더욱 직관적으로 처리할 수 있다.

> 데이터 패칭 예시

```js
import React, { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";

function fetchTodo() {
  return fetch("https://jsonplaceholder.typicode.com/todos/1").then((res) =>
    res.json()
  );
}

function Todo() {
  const { data } = useQuery(["todo"], fetchTodo, { suspense: true });
  return <div>{data.title}</div>;
}

function MyComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Todo />
    </Suspense>
  );
}

export default MyComponent;
```

**Promise를 활용한 Suspense 처리**

React Query가 아니더라도, `<Suspense>`는 비동기 작업에서 일반적으로 사용되는 `Promise`를 처리할 수 있다.

다만, 이를 위해서는 use() 훅과 같은 내부 기능을 통해 Promise의 상태를 직접 확인해야 한다.

예를 들어 `Promise`를 반환하는 방식으로 데이터를 패칭하고 이를 `<Suspense>`로 감싸면, `use()`는 해당 `Promise`가 `pending` 상태일 때 이를 감지하고 그동안 `fallback` UI를 렌더링한다.

이후 `Promise`가 `fulfilled` 상태로 전환되면, `use()`는 데이터를 반환하고 `Suspense`는 대체 UI를 제거한 후 실제 데이터를 렌더링한다.

## 2. Suspense의 특징과 주의해야 할 점

### 2-1. 모든 자식이 준비될 때까지 `fallback`을 보여준다

`Suspense`의 핵심 특징 중 하나는 자식 컴포넌트가 하나라도 `pending` 상태에 있으면 부모 `Suspense`가 그 자식들이 모두 로드될 때까지 `fallback` UI를 보여준다는 점이다.

특히 자식의 자식 컴포넌트가 `pending` 상태일 때도 마찬가지로 부모 `Suspense`는 대기한다.

즉, `Suspense` 내부에 있는 모든 비동기 작업이 완료되지 않으면 부모 `Suspense`의 `fallback`이 활성화된다.

> 예시 코드

```js
<Suspense fallback={<div>Loading Parent...</div>}>
  <ComponentA>
    <ComponentB />
    {/* ComponentB가 pending 상태일 경우, 부모 Suspense의 fallback이 표시됨 */}
  </ComponentA>
  <ComponentC />
  {/* ComponentC가 pending 상태일 경우에도 부모 Suspense의 fallback이 표시됨 */}
</Suspense>
```

`ComponentA`나 그 하위 컴포넌트인 `ComponentB`, 혹은 `ComponentC` 중 하나라도 `pending` 상태일 경우, 부모 `Suspense`의 `fallback`이 작동하게 된다.

### 2-2. 중첩된 Suspense 사용

여러 개의 `Suspense`를 중첩해서 사용하면 각각의 `Suspense`가 독립적으로 동작한다.

이를 통해 자식 컴포넌트 단위로 비동기 작업을 개별적으로 관리할 수 있다.

각 `Suspense`는 자기 범위 안에서 `Promise`가 `pending` 상태일 때만 `fallback`을 보여주기 때문에, 더 세분화된 로딩 UI를 제공할 수 있다.

> 예시 코드

```js
<Suspense fallback={<div>Loading Parent...</div>}>
  <ComponentA />
  <Suspense fallback={<div>Loading Child...</div>}>
    <ComponentB /> {/* ComponentB만 pending일 때는 Child fallback만 표시됨 */}
  </Suspense>
</Suspense>
```

### 2-3. 서버 사이드 렌더링(SSR)에서의 제약

React 18에서는 `Streaming HTML`을 지원해, 서버에서 데이터를 스트리밍으로 클라이언트에 전송하면서 `Suspense`가 이를 처리할 수 있게 되었다.

클라이언트는 서버에서 데이터를 모두 받기 전까지 `Suspense`의 `fallback UI`를 표시하게 된다.

또한, React 18의 `React Server Components`와 `Suspense`는 통합되어 서버에서 처리된 데이터를 클라이언트에서 비동기적으로 렌더링할 수 있다.

이를 통해 서버에서 필요한 데이터를 처리한 후 클라이언트에서 점진적으로 화면을 구성할 수 있게 되었다.

### 2-4. timeout

`Suspense` 자체에는 타임아웃 기능이 내장되어 있지 않다.

만약 비동기 작업이 너무 오래 걸릴 경우, 개발자가 직접 타임아웃을 설정하거나 타임아웃 발생 시 `fallback` 대신 에러 처리를 하도록 별도로 처리해야 한다.

이를 위해 ErrorBoundary를 함께 사용하는 방법도 있다.

### 2-5. ErrorBoundary와의 통합

`Suspense`는 `Promise`의 `pending` 상태만 처리하고, `rejected` 상태의 에러는 처리하지 않는다.

에러가 발생했을 때는 `ErrorBoundary`를 함께 사용해야만 적절한 에러 처리 UI를 표시할 수 있다.

해당 내용은 향후 추가적으로 포스팅하도록 하겠다.

## 3. 마치며

사실 적을 내용들이 더 많았는데, 글이 너무 길어지는 것 같아서 앞부분만 먼저 올린다.

2편에서는 Suspense가 유발하는 네트워크 병목 현상을 살펴보고, 해결 방안에 대해 작성할 예정이다.

이후 기회가 된다면 Suspense와 ErrorBoundary를 엮어서 `pending`과 `rejected` 상태 모두 처리할 수 있는 `Provider`를 만들어볼 예정이다.
