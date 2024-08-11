# 4주차. 탈출구(1) - 추가학습

## Typescript 환경에서의 useRef

### 0. 들어가며

Typescript 환경에서 useRef를 사용해본 개발자들은 많이들 공감할 것이다.

타입 지정을 똑바로 안해주면 에러를 내뿜은 useRef의 모습이 그렇게 미워보일 수 없다.

이번에 useRef 내용을 공부하는 김에 useRef가 type을 어떻게 받는지, 또한 타입을 어떻게 선언해주어야하는지 가볍게 알아보았다.

---

### 1. 인자의 타입과 제네릭의 타입이 T로 일치하는 경우

```js
useRef<T>(initialValue: T): MutableRefObject<T>
```

ref.current를 로컬 변수처럼 활용하는 경우, 해당 타입을 사용한다.

MutableRefObject란 이름과 정의에서 볼 수 있듯, `current` 프로퍼티 자체를 직접 변경할 수 있다.

```ts
interface MutableRefObject<T> {
  current: T;
}
```

---

### 2. 인자의 타입이 null을 허용하는 경우

```js
useRef<T>(initialValue: T | null): RefObject<T>;
```

인자의 타입이 null이 될 수 있는 useRef의 경우, RefObject를 반환한다.

RefObject는 MutableRefObject와는 달리 `current` 프로퍼티가 readonly 속성으로 선언되어 있어 값을 변화시킬 수 없다.

```ts
interface RefObject<T> {
  readonly current: T | null;
}
```

> 꿀팁: ElementRef를 활용해 type 추론할 수 있다.

```ts
// example 1)
import React, { useRef, ElementRef } from "react";

const Component = () => {
  const audioRef = useRef<ElementRef<"audio">>(null);

  return <audio ref={audioRef}>Hello</audio>;
};
```

```ts
// example 2)
import { OtherComponent } from "./other-component";
import React, { useRef, ElementRef } from "react";

type OtherComponentRef = ElementRef<typeof OtherComponent>;

const Component = () => {
  const ref = useRef<OtherComponentRef>(null);

  return <OtherComponent ref={ref}>Hello</OtherComponent>;
};
```

---

### 3. 제네릭의 타입이 undefined인 경우

```js
useRef<T = undefined>(): MutableRefObject<T | undefined>;
```

타입을 제공하지 않은 경우(undefined일 경우), `MutableRefObject<T | undefined>`를 반환한다.

---

### 4. 마치며

이제야 null을 넣는 이유를 알겠다!

그리고 변수처럼 사용하기 위한 useRef는 initialValue를 잘 선언해주자!

---

### References

https://darrengwon.tistory.com/865

https://www.totaltypescript.com/strongly-type-useref-with-elementref

https://light9639.tistory.com/entry/TypeScript-useRef-%EC%82%AC%EC%9A%A9%EC%8B%9C-%EC%97%90%EB%9F%AC-%ED%95%B4%EA%B2%B0

https://driip.me/7126d5d5-1937-44a8-98ed-f9065a7c35b5
