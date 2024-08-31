## 0. 들어가며

기존에 만들어놓았던 VideoPlayer 컴포넌트 관련 이슈가 들어왔다.

특정 페이지에서 VideoPlayer를 전체화면으로 전환했을 때, 전체화면으로 확장된 컴포넌트 위에 다른 페이지들의 요소가 보인다는 것이다.

![](https://velog.velcdn.com/images/hayou/post/194ddd6e-c4b2-45dc-81b8-a655ecde8a95/image.png)

코드를 확인해보니

```jsx
<div style={{position: relative}}>
  <h3 style={{position: absolute, z-index: 5}}/>
  <div>
    <VideoPlayer style={{position: fix, z-index: 30}}/>
  </div>
  <div style={{position: absolute, z-index: 10}}/>
</div>
```

이런 구조로 이루어져있었고, 분명히 VideoPlayer 컴포넌트의 z-index가 30으로 가장 큰 데도 불구하고 이해되지 않는 현상이었다.

이를 위해 z-index를 다시 공부해보았고, 그 과정에서 Stacking Context라는 내용을 학습하게 되었다.

## 1. Stacking context란

쌓임 맥락(stacking context)이란 가상의 Z축(사용자 기준)을 사용한 HTML 요소의 3차원 개념화이다.

각각의 HTML 요소는 자신의 속성에 따른 우선순위를 사용해 3차원 공간을 차지한다.

### Stacking context의 성질

> Stacking Context는 다음과 같은 성질을 갖는다.

- Stacking context가 다른 Stacking context을 포함할 수 있고, 함께 계층 구조를 이룬다.

- Stacking context는 형제 Stacking context과 완전히 분리됩니다. Stacking을 처리할 땐 자손 요소만 고려합니다.

- 각각의 Stacking context는 독립적이다. 어느 요소의 콘텐츠를 쌓은 후에는 그 요소를 통째로 부모 Stacking context 안에 배치한다.

> Stacking Context 예시

다음과 같은 구조의 `div`들이 있을 때,

```jsx
<Div #1/>
<Div #2/>
<Div #3>
  <Div #4/>
  <Div #5/>
  <Div #6/>
</Div #3>
```

![](https://velog.velcdn.com/images/hayou/post/5ca1e3ff-8c7b-4f96-bd50-ee9e1920f8d4/image.png)

`div #4`, `div#5`, `div #6`은 같은 stack context 안에 존재하기 때문에 기대한 바대로 겹쳐진다.

하지만 `div #4`의 z-index가 6으로 `div #1`의 z-index 값보다 큼에도 같은 stack context가 아니기 때문에 부모 요소(`div #3`)의 stack context에 영향을 받음을 알 수 있다.

## 2. Stacking context 안의 stacking order

그렇다면 같은 stacking context 안의 요소들 간의 stacking order는 어떻게 결정될까?

다음은 stacking order를 결정하는 기본적인 규칙이다.

1. stacking context의 root element

2. `z-index`를 음수값으로 갖는 positioned element (children 포함)

   - 높은 값은 낮은 값보다 앞에 쌓이고, 같은 값은 HTML의 모양에 따라 쌓인다.

3. Non-positioned

   - HTML의 모양에 의한 순서를 가짐

4. `auto` 를 `z-index` 값으로 갖는 Positioned elements (children 포함)

   - HTML의 모양에 의한 순서를 가짐

5. 양수의 값을 `z-index`값으로 갖는 positioned elements (children 포함)

   - 높은 값은 낮은 값보다 앞에 쌓이고, 같은 값은 HTML의 모양에 따라 쌓인다.

## 3. 새로운 Stacking context 생성하기

상위 요소를 건드릴 수 없는 입장에서, 이미 형성된 stacking context를 수정할 방안이 없었다.

이를 해결하기 위해 새로운 stacking context를 생성해주어야 했다.

> 다음은 Stacking Context를 생성하는 요소들이다.

- 문서의 루트 요소. (`<html>`)
- `position`이 `absolute` 또는 `relative`이고, `z-index`가 `auto`가 아닌 요소.
- `position`이 `fixed` 또는 `sticky`인 요소. (`sticky`는 모든 모바일 브라우저에서는 해당하지만 구형 데스크톱 브라우저에서는 해당하지 않음)
- `container queries`를 위한 `container-type`이 `size` 또는 `inline-size`인 요소.
- 플렉스(`flexbox`) 컨테이너의 자식 중 `z-index`가 `auto`가 아닌 요소.
- 그리드(`grid`) 컨테이너의 자식 중 `z-index`가 `auto`가 아닌 요소.
- `opacity`가 1보다 작은 요소. (불투명도 명세 참고)
- `mix-blend-mode`가 `normal`이 아닌 요소.
- 다음 속성 중 하나라도 none이 아닌 값을 가진 요소.
  - `transform`
  - `filter`
  - `backdrop-filter`
  - `perspective`
  - `clip-path`
  - `mask` / `mask-image` / `mask-border`
- `isolation`이 `isolate`인 요소.
- `will-change`의 값으로, 초깃값이 아닐 때 새로운 쌓임 맥락을 생성하는 속성을 지정한 요소.
- `contain`이 `layout`, `paint`, 또는 둘 중 하나를 포함하는 값(`strict`, `content` 등)인 요소.
- top layer에 배치된 요소와 이에 상응하는 `::backdrop. fullscreen` 및 `popover` 요소.

이 중 새로운 stacking context를 생성하며 상위 요소의 영향을 받지 않은 `isolation: isolate` 옵션을 css에 추가해주었고,

원하는 대로 가장 최상단에 VideoPlayer 컴포넌트가 보여지게 되었다.

## 4. 마치며

매번 고민 없이 사용했던 z-index가 이런 방식으로 쌓인다는 사실을 배울 수 있었다.

이후에 만날 z-index들은 단순히 숫자 값만을 관리하며 사용하는 것이 아니라, stacking context를 고려하며 개발해야겠다.

반복적인 개발을 할수록 css를 등한시하게 되었었는데, 다시금 css 공부를 해놓아야겠다.

### references

https://developer.mozilla.org/ko/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context
https://developer.mozilla.org/en-US/docs/Web/CSS/isolation
https://dongmin-jang.medium.com/css-stacking-context-172f9bd1af8b
