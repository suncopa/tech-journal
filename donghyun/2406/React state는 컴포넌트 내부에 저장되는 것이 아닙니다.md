면접을 말아먹은 계기로 부족했던 부분을 채워가는 과정에서
리액트 리렌더링의 동작에 대해 공부하다가 한가지 의문이 들었다.

리렌더링이 발생하면 컴포넌트 함수가 다시 호출되면서
컴포넌트 내부에 선언된 함수들도 새롭게 다시 생성되기 때문에 함수의 참조값이 변한다.

> 그런데 useState는 어떻게 값을 그대로 유지하는걸까?

## 혹시 state는 컴포넌트 외부에 저장되는 것 아닐까?

상태는 아무리 리렌더링이 발생해서 함수가 다시 호출되어도 이전의 값을 유지한다.
**그런데 상태가 함수 내부에 저장된다면, 상태값도 초기화 되어야하는 것이 아닌가?**

공부하고 취업하고 리액트와 함께한 2년동안
항상 컴포넌트 내부에 상태를 선언해왔고,
컴포넌트가 언마운트되면 상태도 같이 사라지기 때문에
**당연히 컴포넌트 내부에 저장된다고 생각했다.**

그러나 리렌더링이 발생할때마다 컴포넌트 함수는 다시 새롭게 호출되면서
컴포넌트 내부의 함수도 새롭게 생성되어 참조값도 바뀌지만
오직 상태만은 변하지 않고 이전 상태를 기억하며 유지된다는 것을 깨닫게 되었다.
그래서 **"상태는 컴포넌트 외부에 저장되어 유지된다"** 라는 확신을 갖게 되었다.

## 그럼 도대체 state는 어디에 저장되나?

처음엔 chatGPT한테 물어봤는데 계속 엉뚱한 소리를 해서
결국 구글에 how react component preserve state라고 검색을 해봤는데

정말 어이없게도 리액트 공식문서에 마침 이것과 관련한 문서가 있었다..

> **State is tied to a position in the render tree**
> React builds render trees for the component structure in your UI.
> When you give a component state, **you might think the state “lives” inside the component. But the state is actually held inside React.** React associates each piece of state it’s holding with the correct component by where that component sits in the render tree.

### 요약

> **상태는 렌더 트리에 묶여있다.**
> 당신은 상태가 컴포넌트 내부에 '살고있다' 라고 생각할 수도 있지만,
> 사실 상태는 리액트 내부에 존재한다.

어쩐지 이상하더라니.. 리액트를 사용하는 사람들의 90% 이상은 이걸 모르지 않을까?
나에게는 이게 너무 충격적이여서 나만 모르고 살았나 싶은 생각이 들었다.

심지어 친절하게 이것을 증명하는 코드 예제도 제공해줬다.

```jsx
<div>{isFancy ? <Counter isFancy={true} /> : <Counter isFancy={false} />}</div>
```

예를 들어서, 위의 코드 같은 경우 분명히 2개의 Counter 컴포넌트가 있지만,

1. render tree 상 같은 위치 (div의 첫번째 child)에 존재하고
2. 완전히 동일한 컴포넌트를 사용했다
3. 두 컴포넌트의 key는 동일하다 (둘 다 key가 없으므로)
   이 3가지 조건을 충족하므로 두 컴포넌트는 상태값을 공유한다.

내가 지금까지 알고있던 상식으로는 전혀 상상할 수 없었다.
분명히 서로 다른 컴포넌트이지만 state는 컴포넌트가 아닌 render tree에 종속되어 있기 때문에
두 컴포넌트가 동일한 source에서 state에 대한 정보를 제공받기 때문에
두 컴포넌트는 하나의 상태를 공유하게 되는 것이다.

## Key는 list를 렌더링 할 때만 사용하는 것이 아니다.

또 이번 계기로 인해 key에 대한 이해도 더 증가했다.
바로 위에서 설명한 3가지 조건중 1,2번만 충족하고 3번의 key가 다른 경우에
리액트는 render tree에 상태가 저장되는 위치를 다른 위치로 인식한다.
그렇기 때문에, 위의 예시 코드에서 key={isFancy}를 넣어주기만 해도
동일한 상태를 공유하던 두 컴포넌트는 각자 다른 상태를 참조하게 되는 것이다.

이를 응용하면 **여러 (동일한) 컴포넌트가 하나의 상태를 참조**하게 할 수도 있고
반대로 **하나의 컴포넌트가 여러 상태를 참조**하게 만들 수도 있다. (key를 활용)

```jsx
export default function Messenger() {
  const [to, setTo] = useState(contacts[0]);
  return (
    <div>
      <Chat key={to.id} contact={to} />
    </div>
  );
}
```

위의 예시에서 Chat 컴포넌트는 to라는 상태가 바뀔 때마다
Chat 내부에서 참조하는 상태가 달라지기 때문에 매번 초기화 된다.

key만 달라져도 render tree에서 다른 요소로 인식하고,
key가 같으면 또 같은 요소로 인식할 수 있기 때문에
index를 key로 사용하면 안되고, 고유한 값이여야만 하는 것이였다.

이제서야 리액트 상태와 리렌더링의 동작을 조금 더 제대로 이해하게 된 것 같다.

출처: https://react.dev/learn/preserving-and-resetting-state
