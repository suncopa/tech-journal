어떻게든 취업을 해서 나름 2년차 개발자가 되었지만
그에 걸맞지 않게 부실한 기초를 좀 더 다져야 하겠다는 생각이 들었다.

그래서 node.js에 대한 지식부터 다시 공부해보게 되었는데,
그 때는 취준할 때 쓸 수 있을 정도로만 대충 배우고 넘어가긴 했지만
지금 다시보니 생각보다 제대로 모르고 넘어간 부분이 너무 많았다.

### node versions

원래 한 컴퓨터에 1가지 버전만 설치 가능한 줄 알았는데
여러 버전을 설치할 수 있고 심지어 프로젝트마다 다른 버전으로 실행시킬 수도 있었다.
package.json engines 옵션을 통해 프로젝트의 node version을 강제할 수도 있다.
그리고 또 안전한 버전인 LTS는 짝수로, 실험적인 버전은 홀수로 낸다는 것도 알게 되었다.

### SemVer

npm 패키지는 x.y.z 이런 식으로 Semantic Versioning 규칙을 따른다.
여기서 x, y, z의 각각의 개념에 대해서 정확하게 알지 못했었다.

> x: major, x가 달라지면 동작에 문제가 있을 수 있는 기능이 추가되었음.
> y: minor, 기능이 추가되었으나 y가 달라져도 사용에 지장이 없음.
> z: patch, 버그 수정, 기능 추가 없음. (z 변해도 사용 무관)

이걸 몰랐기 때문에 후술할 package-lock.json도 제대로 모르고 있었던 것 같다.

### package-lock.json

원래 나는 package-lock.json 파일은 패키지들이 의존하는
다른 패키지들의 버전까지 상세하게 적어둔 package.json의 상세버전인 줄만 알았다.
그러나 실제로는 SemVer의 ^(caret)과 ~(tilde) 때문에
package.json에 적힌 버전과 실제로 설치되는 버전이 달라질 수 있게 되는데
설치 시점에 이를 정확하게 명시해주기 위한 파일이 package-lock.json인 것이였다.

회는 싯가로 날마다 가격이 달라질 수 있어 정확한 가격은 영수증에 찍히는 그 순간 알 수 있는데,
패키지도 자주 업데이트가 일어나서 최신 버전은 시점마다 늘 달라지기 마련이고,
^와 ~를 사용해서 버전을 명시한 경우 실제로 설치되는 버전은
**npm install을 터미널에 입력한 바로 그 순간**에만 알 수 있는 것이다.
그래서 package-lock.json 파일은 npm install을 하는 순간 새로 생성되고,
이렇게 생성된 package-lock.json 파일을 바탕으로 실제 프로젝트가 설치되는 것이였다.

지금까지는 package-lock.json 파일이 바뀌면 왜 자꾸 바뀌는거지? 했었는데
이제는 '아 몇몇 패키지에 버전이 업데이트 되었구나' 라고 생각할 것 같다.

### npx

이것도 사실 별거 아닐수도 있지만 완전히 잘못 알고 있었다.
'패키지를 설치하지 않고 실행만 하고 싶은 경우에 사용하는 명령어'라고 알고 있었는데
그래서 진짜로 패키지를 설치도 안하고 실행하는 줄 알았는데
실제로는 임시로 일단 패키지를 설치하고 실행한 다음 제거하는 로직이였다..

### 마무리

다음에는 npm, pnpm, yarn에 대해서 공부해볼 계획이다.
