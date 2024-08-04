# 3주차. State 관리하기

## State 로직을 리듀서로 작성하기

### 0. 들어가며

솔직하게 고백할 내용이 있다.

난 프론트엔드 개발자로 진로를 정하고 프론트엔드 개발을 공부하기 시작한지 1년 반이 조금 넘었다.

그 과정에서 단 한번도 useReducer 훅을 사용해 상태 관리를 해본 적이 없다.

그러다보니 처음 Redux를 학습할 때도 전혀 와닿지 않았었고, 그런게 있구나 하며 Recoil 등으로 눈을 돌렸었다.

사실 나는 반쪽짜리 프론트엔드 개발자가 아니었을까. 하는 한탄과 함께 이 글을 시작해보고자 한다.

---

### 1. reducer를 사용하여 state 로직 통합하기

천 리 길도 한 걸음 부터라고 했다.

우선 공식문서를 활용해 reducer 로직을 작성해보고 이후 내용을 확장해 나가보자.

> 1단계 : setState -> action을 dispatch 함수로 전달

```js
// setStateAction이 포함된 기존 핸들러 함수

function handleAddTask(text) {
  setTasks([
    ...tasks,
    {
      id: nextId++,
      text: text,
      done: false,
    },
  ]);
}
```

```js
// setStateAction을 지우고 dispatch 함수 추가

function handleAddTask(text) {
  dispatch(
    // action 객체 :
    {
      type: "added",
      id: nextId++,
      text: text,
    }
  );
}
```

action 객체에는 어떤 값이든 넣을 수 있지만, 일반적으로 *어떤 상황이 발생하는지*에 대한 최소한의 정보를 담아야 함.

일반적으로 `type` 에 발생한 일을 설명하는 문자열을 넘겨주는 형식을 취함.

> 2단계 : reducer 함수 작성

```js
// 첫 번째 인자에 state, 두 번째 인자에 action 객체 선언

function tasksReducer(tasks, action) {
  // switch 문을 활용해 action.type을 분기처리
  switch (action.type) {
    case "added": {
      // 다음 state 반환
      return [
        ...tasks,
        {
          id: action.id,
          text: action.text,
          done: false,
        },
      ];
    }
    ...

    default: {
      throw Error("Unknown action: " + action.type);
    }
  }
}
```

> 3단계 : 컴포넌트에서 reducer 사용하기

```js
import { useReducer } from 'react';
import AddTask from './AddTask.js';
import TaskList from './TaskList.js';

export default function TaskApp() {
  // const [tasks, setTasks] = useState(initialTasks);
  const [tasks, dispatch] = useReducer(
    tasksReducer,
    initialTasks
  );

  function handleAddTask(text) {
    dispatch({
      type: 'added',
      id: nextId++,
      text: text,
    });
  }

  return (
    <>
      <AddTask
        onAddTask={handleAddTask}
      />
      ...
    </>
  );
}

function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'added': {
      return [...tasks, {
        id: action.id,
        text: action.text,
        done: false
      }];
    }
    ...
  }
}

let nextId = 3;
const initialTasks = [
  { id: 0, text: 'Visit Kafka Museum', done: true },
  { id: 1, text: 'Watch a puppet show', done: false },
  { id: 2, text: 'Lennon Wall pic', done: false }
];
```

---

### 2. useState와 useReducer 비교하기

벌써 뭔가 복잡하다. 이렇게 복잡한 useReducer를 왜 써야하는걸까?

우선 useReducer는 Redux의 reducer 패턴(https://redux.js.org/usage/structuring-reducers/structuring-reducers)에서 영감을 받아 만들어졌다.

해당 reducer 패턴을 이용하면 얻을 수 있는 장점은 다음과 같다.

1. 상태 관리의 예측 가능성

   - 디버깅이 용이함
   - 상태 변경 추적이 쉬움

2. 코드의 가독성과 유지 보수성

   - 명확한 상태 변경 로직을 가짐
   - 모듈화 가능(상태와 상태 변경 로직을 분리하여 관리)

3. 불변성 유지

4. 테스트 용이성

   - 리듀서 함수는 순수함수로 이루어져서 동일한 입력에 대해 항상 동일한 출력을 반환

5. 확장성

   - 상태 관리가 복잡한 상황에서 확장하기 용이함
   - 다양한 상태를 처리할 수 있음

6. 일관된 상태 관리

   - 중앙 집중화된 상태 변경 로직을 가짐
   - 단방향 데이터 흐름을 가짐

이러한 장단점을 따져가며 필요한 곳에 적절하게 사용할 수 있다면 매우 큰 도움이 될 것이다.

그렇다면 어떤 상황에 useState 훅 대신 useReducer 훅을 사용하면 이득을 얻을 수 있을까?

> 다음 상태가 이전 상태에 의존하는 경우

```js
// example 1)

function reducer(state, action) {
  switch (action.type) {
    case "ADD":
      return { count: state.count + 1 };
    case "SUB":
      return { count: state.count - 1 };
    default:
      return state;
  }
}

function Counter() {
  const [state, dispatch] = React.useReducer(reducer, { count: 0 });
  return (
    <>
      Count: {state.count}
      <button onClick={() => dispatch({ type: "ADD" })}>Add</button>
      <button onClick={() => dispatch({ type: "SUB" })}>Substract</button>
    </>
  );
}
```

```js
// example 2)

const [value, toggleValue] = React.useReducer(previous => !previous, true)

<button onClick={toggleValue}>Toggle</button>

```

> 복잡한 상태 관리를 할 경우(중첩된 객체나 배열 등)

```js
const [state, dispatch] = React.useReducer(fetchUsersReducer, {
  users: [
    { name: "John", subscribed: false },
    { name: "Jane", subscribed: true },
  ],
  loading: false,
  error: false,
});
```

> 테스트를 용이하게 하기 위해

```js
test("increments the count by one", () => {
  const newState = reducer({ count: 0 }, { type: "ADD" });
  expect(newState.count).toBe(1);
});
```

---

### 3. useReducer 팁

> useReducer를 사용할 때 리덕스 스타일 가이드를 적용하자

- Do Not Mutate State (https://redux.js.org/style-guide/#do-not-mutate-state)

- Reducer Must Not Have Side Effects (https://redux.js.org/style-guide/#reducers-must-not-have-side-effects)

- Model Actions as Events, Not Setters (https://redux.js.org/style-guide/#model-actions-as-events-not-setters)

> 이벤트 주도 Reducer

```js
// Model Action as Events Example

const reducer = (state, action) => {
  // ✅ ui는 이벤트만 전달하며 로직은 reducer 내부에 존재하게 됩니다.
  switch (action) {
    case "increment":
      return state + 1;
    case "decrement":
      return state - 1;
  }
};

function App() {
  const [count, dispatch] = React.useReducer(reducer, 0);

  return (
    <div>
      Count: {count}
      <button onClick={() => dispatch("increment")}>Increment</button>
      <button onClick={() => dispatch("decrement")}>Decrement</button>
    </div>
  );
}
```

```js
// Model Action as Setters Example

const reducer = (state, action) => {
  switch (action.type) {
    // 🚨 새로운 숫자만 받는 "어리석은" reducer
    case "set":
      return action.value;
  }
};

function App() {
  const [count, dispatch] = React.useReducer(reducer, 0);

  return (
    <div>
      Count: {count}
      <button onClick={() => dispatch({ type: "set", value: count + 1 })}>
        Increment
      </button>
      <button onClick={() => dispatch({ type: "set", value: count - 1 })}>
        Decrement
      </button>
    </div>
  );
}
```

> Reducer에 props 전달하기

```js
const reducer = (amount) => (state, action) => {
  switch (action) {
    case "increment":
      return state + amount;
    case "decrement":
      return state - amount;
  }
};

const useCounterState = () => {
  const { data } = useQuery(["amount"], fetchAmount);
  return React.useReducer(reducer(data ?? 1), 0);
};

function App() {
  const [count, dispatch] = useCounterState();

  return (
    <div>
      Count: {count}
      <button onClick={() => dispatch("increment")}>Increment</button>
      <button onClick={() => dispatch("decrement")}>Decrement</button>
    </div>
  );
}
```

- 서버와 클라이언트 state를 분리할 수 있음

- data가 없을 때도 default value 할당 가능

- UI쪽 로직 변경 없음

---

### References

- https://dev.to/spukas/3-reasons-to-usereducer-over-usestate-43ad
- https://medium.com/@queenskisivuli/when-to-use-usereducer-and-when-not-to-use-it-in-react-f8cd5208aee8
- https://www.philly.im/blog/use-state-vs-use-reducer
- https://redux.js.org/style-guide/
