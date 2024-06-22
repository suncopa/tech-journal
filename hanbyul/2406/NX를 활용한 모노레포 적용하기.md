# NX를 활용한 모노레포 적용하기

## 1. 모노레포란?

![monorepo_multirepo](./monorepo_multirepo.png)

### 모놀리스 아키텍쳐

1. 각각의 기능들을 개발한 후 하나의 앱으로 패키징하여 배포
2. 일반적으로 하나의 레포지토리 내에 하나의 큰 앱만 존재
3. 코드 공유가 쉽고 형식 통일과 배포 관리에 용이
4. 병목현상, 사이드 이펙트, 프레임워크(언어)의 제한 등의 단점

### 멀티레포(폴리레포)

1. 각 도메인 및 기능 시스템 단위로 생성하여 운영
2. 각 프로젝트가 고유의 저장소를 가짐
3. 다른 프로젝트와의 의존성을 가지고 있지 않아 독립적으로 빠르게 개발이 가능
4. 크기가 가벼워 프로젝트 관리 수월
5. 각 저장소에 대한 관리, 코드 컨벤션의 통일이 어려워 유지보수성이 낮아질 수 있음

### 모노레포

1. 멀티레포와 반대되는 방식
2. 버전 관리 시스템에서 두 개 이상의 프로젝트 코드가 동일한 저장소에 저장
3. 대규모 프로젝트에 적합
4. 코드의 일관성, 라이브러리의 공유 등 향상된 개발자 경험 제공
5. 개발 환경 구성의 어려움, 코드 충돌 위험, 그리고 배포 복잡성과 같은 단점

## 2. 모노레포 적용 계기

- 여러 협업사와의 작업 -> 통일된 DX가 필요
- 많은 개수의 App (약 36개 이상의 app 개발 예정)
- 각 App끼리 공통된 UI 컴포넌트 및 API 로직 등이 많음

## 3. nx를 활용한 프로젝트 세팅

### 최초 nx 프로젝트 생성

```
$ npx create-nx-workspace@latest
```

```
NX   Let's create a new workspace [https://nx.dev/getting-started/intro]

✔ Where would you like to create your workspace? · nx-example
✔ Which stack do you want to use? · react
✔ What framework would you like to use? · none
✔ Integrated monorepo, or standalone project? · integrated
✔ Application name · app1
✔ Which bundler would you like to use? · vite
✔ Test runner to use for end to end (E2E) tests · none
✔ Default stylesheet format · styled-components
✔ Set up CI with caching, distribution and test deflaking · skip
✔ Would you like remote caching to make your build faster? · yes
```

### 추가 app 생성

```
$ npx nx g @nx/react:app app2
```

```
 NX  Generating @nx/react:application

✔ Would you like to add React Router to this application? (y/N) · true
✔ Which E2E test runner would you like to use? · none
✔ What should be the project name and where should it be generated? · app2 @ apps/app2
```

같은 방식으로 JS 기반의 Angular, Vue, Next 등 프론트엔드 프레임워크 뿐만 아니라 node 기반의 Express, Nest 등 서버 프레임워크까지 생성할 수 있다.

### 공통 library 생성

```
npx nx g @nx/react:lib common-components
```

```
 NX  Generating @nx/react:library

✔ What unit test runner should be used? · none
✔ Which bundler would you like to use to build the library? Choose 'none' to skip build setup. · none
```

App 생성과 같은 방식으로 공통 library를 생성할 수 있다.

### App에서 Lib 호출하기

```ts
import { CommonComponents } from '@nx-example/common-components';

...

export function App() {
  return (
    <>
      <CommonComponents />
    </>
  );
}

export default App;

```

### App-Lib 간의 dependency 확인하기

```
$ npx nx graph
```

![graph](./graph.png)

## nx의 특징

### app, lib 모두 각각 독립적인 빌드 단위이다.

- 따라서 각각의 app 및 lib를 빌드하고 독립적으로 배포할 수 있다.

### app-lib 간의 store를 공유할 수 있다.

```ts
// 특정 app의 main.tsx

root.render(
  <StrictMode>
    <RecoilRoot>...</RecoilRoot>
  </StrictMode>
);
```

```ts
// 특정 lib의 store/page.ts

export const pageAtom = atom({
  key: 'pageStates',
  default: {
    selectedPage: 1,
    pageTotalNums: 1,
  },
});
```

```ts
// 특정 lib의 hooks/sample.tsx

const useSampleHook = () => {
  const { selectedPage } = useRecoilValue(pageAtom);
  return selectedPage;
};
```

- 이 경우 app의 하위 컴포넌트에서 useSampleHook을 호출했을 때, lib에는 RecoilRoot가 선언되지 않았음에도 store에 접근하여 selectedPage를 불러올 수 있다.

### lib-lib 간의 참조를 활용해 새로운 lib를 생성할 수 있다.

```ts
// api/src/api.tsx

export const submitData = async (data: submitDataType) => {
  try {
    const res = await axios.post({ ... });
    return res.data;
  } catch (e: unknown) {
    console.error('Submit Error:', e);
  }
};
```

```ts
// logicUi/SubmitButton.tsx

import { Button } from '@projectName/ui';
import { submitData } from '@projectName/api';

export const SubmitButton = (data: submitDataType) => {
  return <Button onClick={() => submitData(data)} />;
};
```

### nx의 cache 기능을 활용해 빌드/테스트에 소요되는 시간을 감소시킬 수 있다.

- 테스크 실행 명령어를 실행하면, 여러방식의 설정 파일로 부터 캐싱 방법을 체크한다.
  (nx.json / project.json / package.json)
- 코드에 변동이 없을 경우, 캐싱되어 있던 해당 app/lib는 새로 빌드/테스트를 시행하지 않는다.
- https://nx.dev/concepts/how-caching-works

### 다양한 플러그인을 지원하여 거의 대부분의 JS 기반 기술 스택을 사용할 수 있다.

- 웹 프레임워크, 서버 프레임워크, 테스팅 툴 등 다양한 플러그인을 지원한다.
- https://nx.dev/plugin-registry

## 배운점

1. 기존 멀티레포에서 작업하던 내용들을 모노레포에 포팅하여 공통 라이브러리로 빼내는 작업을 했는데, 생각보다 확장성이 떨어지는 코드를 작성해왔음을 깨달았다.
2. 컴포넌트의 분리와 아토믹 구조를 가져가면서 확장성을 용이하게 하고 DX를 향상시킬 수 있었다.
3. 실제로 세팅 이후 매번 같은 반복을 하지 않고 비슷한 구조의 app들을 작성하기에 용이했다.
4. 모노레포를 공부하기 전에는 막연히 프론트엔드가 비대해지며 폴리레포 -> 모노레포 -> 마이크로 프론트엔드의 순서로 발전해나간다고 생각하고 있었다. 하지만 폴리레포와 모노레포는 각각 장단점이 존재하는 소프트웨어 개발전략일 뿐이고, 마이크로 프론트엔드 아키텍쳐를 구현하기 위한 하나의 방법론일 뿐이었다고 깨달았다.
