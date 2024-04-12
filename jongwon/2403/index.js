const url = new URLSearchParams(window.location.search);

if (url.size) {
  console.log("어쩌구 로직 실행");
}

// 아래로 대체
const hasParams = !![...url.values()].length;
if (hasParams) {
  console.log("어쩌구 로직 실행");
}
