## 0. 들어가며

면접 단골 질문이 있다. '자바스크립트의 이벤트 루프에 대해 설명해보세요.'

아직까지 면접에서 직접 마주쳐본 적은 없지만, 동작 원리와 필요성에 대해서는 간단히 공부해놓았었다.

그러다 우연한 기회로 유튜브에서 훌륭한 강의를 듣게 되어, 정리하고 나누고자 한다.

## 1. Javascript의 single thread

![](https://velog.velcdn.com/images/hayou/post/409f4530-1bb4-4d3d-bdd1-71797a8dc316/image.png)

다들 알다싶이 자바스크립트는 싱글 스레드 기반으로 동작한다.

즉 하나의 Call Stack을 가진다는 이야기이고, 이는 곧 한 번에 하나의 task만을 처리할 수 있다는 뜻이다.

특정 이벤트가 발생하면 task가 call stack에 쌓이게 되고, 자바스크립트 엔진은 각각의 task들을 하나씩 처리한다.

### Single-threded Problem

따라서 싱글 스레드는 시간이 많이 소요되는 작업이 추가되면 해당 작업을 완수할 때까지 프로그램이 정지하는 치명적인 단점을 갖는다.

예를 들어, 네트워크 요청, setTimeout, 사용자 입력 등의 작업이 이러한 문제를 일으킬 수 있다.

그러나 자바스크립트는 Web API를 이용해 이 문제를 방지하고, 작업이 진행되는 동안에도 끊김 없이 사용자에게 결과를 보여준다.

## 2. Web APIs

![](https://velog.velcdn.com/images/hayou/post/98038ce0-1c52-4810-b846-e8ed15da7c10/image.png)

Web API란 `fetch`, `setTimeout`, `Geolocation` 등 브라우저가 제공하는 다양한 기능을 호출할 수 있는 API를 말한다.

이 중 일부 Web API는 오래 걸리는 작업을 브라우저가 대신 처리하게 하여, 메인 프로그램이 정지되는 것을 방지한다.

이 때 비동기 처리를 위한 Web API는 `callback` 기반이거나 `promise` 기반으로 동작한다.

## 3. Callback-based APIs

영상에서 사용된 예시 코드를 보자.

```js
navigator.geolocation.getCurrentPosition(
  (position) => console.log(position), // successCallBack
  (error) => console.error(error) // errorCallBackk
);
```

해당 코드가 동작하는 방식을 알아보자.

1. 우선 CallStack에 `getCurrentPosition()` 함수가 추가된다.
   하지만 이는 WebAPI 함수 내부의 콜백을 등록하기 위함이다.

2. CallStack에서 해당 함수가 pop되고, Web API인 `getCurrentPosition`의 `successCallback`과 `errorCallback`을 등록한다.

![](https://velog.velcdn.com/images/hayou/post/dd3df9cc-80eb-4789-9a88-f4daf762b831/image.png)

3. Web API가 비동기 작업을 시작한다.

4. 브라우저는 사용자에게 팝업을 띄우고 응답을 기다린다.
   해당 팝업은 callstack 위에 존재하는 것이 아니기 때문에 자바스크립트 엔진이 다른 task들을 수행하는데 지장이 없다.

5. 사용자가 팝업에 반응할 경우, callback function을 task queue에 넣는다.

## 4. Task Queue (Callback Queue)

Callback Queue라고도 불리는 Task Queue는 Web API의 callback 함수들이나 eventHandler 등에서 호출한 callback 함수들을 queue에 넣어 관리한다.

```js
// 다음과 같은 함수들의 callback(() => {...})이 task queue의 task로 들어간다.

setTimeout(() => {...}, [delay]);

setInterval(() => {...}, [delay]);

xhr.onload = () => {...}

button.addEventListener('click', () => {...});
```

이때 여러개의 Web API callback이 완료될 경우, 완료된 순서대로 Task Queue에 해당 callback을 쌓는다.

이렇게 task queue에 쌓인 task들을 처리하기 위해 드디어 오늘의 주인공 **Event Loop**가 등장한다.

**Event Loop**는 Call Stack에 쌓여있는 task가 있는지 확인한 뒤, Call Stack이 비어있을 경우 task queue에서 task를 꺼내와 Call Stack으로 이동시킨다.

![](https://velog.velcdn.com/images/hayou/post/6547301f-73ee-49af-b73f-994253c3b506/image.png)

## 5. Microtask Queue

그렇다면 마지막으로 Microtask Queue는 어디에 쓰이는 것일까?

기본적으로 `promise` 기반의 비동기 처리를 위해 사용되고, 이외의 예시는 하단의 코드를 보자.

```js
.then(() => {...});

.catch(() => {...});

.finally(() => {...});

async function asyncFunc() {
  await ...
  // Function body execution following await
}

queueMicroTask(() => {...});

new MutationObserver(() => {...});

```

_queueMicroTask 참고: https://developer.mozilla.org/en-US/docs/Web/API/queueMicrotask_

_MutationObserver 참고: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver_

해당 callback들은 microtask queue에 쌓여 처리된다.

Microtask queue는 Task Queue보다 우선순위가 높다.

따라서 Event Loop는 Callstack이 비었을 경우 우선 Microtask queue의 task를 먼저 실행하고, Microtask queue의 task를 모두 처리한 후 비로소 Task Queue의 task들을 처리한다.

![](https://velog.velcdn.com/images/hayou/post/14b6ca49-4077-48a9-8b05-4da4fdebbd5a/image.png)

## 마치며

자바스크립트의 이벤트 루프는 싱글 스레드의 한계를 극복하고, 비동기 작업을 효율적으로 처리하기 위한 핵심 메커니즘이다.

Task Queue와 Microtask Queue의 작동 방식을 이해하면, 자바스크립트가 어떻게 끊김 없이 사용자 경험을 제공할 수 있는지 알 수 있다.

사실 글로 보는 것보다 아래 링크에서 영상으로 직접 보는 것이 이해하는 데 큰 도움이 될 것이다. 직접 확인해보기를 추천한다!

### references

https://youtu.be/eiC58R16hb8?si=_k4jmlTFTGVKOfZ-
