## 0. 들어가며

진짜 머리털 다 뽑히는 줄 알았다.

온갖 빌드 에러와 마주하며 거의 일주일이 걸려 Expo 환경의 React-Native 앱에 FCM(Firebase Cloud Messaging)을 붙일 수 있었다.

관련된 한글 아티클이 적어서, 조금이나마 다른 이들에게 도움이 될까 글을 적어본다.

## 1. FCM 적용 방법

사실 나는 Firebase 프로젝트 생성부터 애를 먹었다. 과거에 적용할 때는 콘솔창이 이렇게 안생겼었는데...

우선 Firebase 계정 생성은 생략하겠다. 또한 그리고 해당 내용이 메인이 아니기 때문에 캡쳐는 최대한 지양할 것이다.

### 1-1. 프로젝트 생성

우선 [Firebase 콘솔](https://console.firebase.google.com/u/0/?hl=ko)에 접속해 새 프로젝트를 생성해주자.

프로젝트 명을 작성을 하고, Google Analytics를 적용할 것인지 물어본다(해당 계정이 필요하다).

각자의 프로젝트에 맞는 설정을 하고, 프로젝트 생성을 하면 다음과 같은 화면을 만나볼 수 있다.

![](https://velog.velcdn.com/images/hayou/post/f3bd9863-1a44-4f55-99e3-a32de1ab2824/image.png)

여기서 우선 iOS를 클릭해 내 앱을 등록해보자.

### 1-2. Apple 앱에 Firebase 추가

1. 앱 등록: Apple 번들 ID를 넣어주자. 대부분의 사람들은 app.json에 이미 작성되어 있을 것이다.

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.company.appname"
    }
  }
}
```

2. 앱을 등록하면, `GoogleService-Info.plist`라는 구성 파일을 다운 받을 수 있게 된다.
   잘 저장해서 RN 프로젝트 루트 폴더에 넣어주자.
   이 때, 해당 파일에는 API_KEY 등이 포함되어 있어, git에 추가되지 않게 조심히 관리하자.
   (하지만 .gitignore에는 넣지 않도록 하자. 이는 뒤에 가서 설명할 예정이다)

3. 이후의 내용은 Swift 기반의 iOS 설정 방법이라 우리는 다른 문서를 찾으러 가보자.

4. Expo 내에 패키지 설치 및 plugin 설정

```bash
npx expo install @react-native-firebase/app @react-native-firebase/messaging
```

우선 expo를 활용해 react-native-firebase SDK를 설치해준다.

이후 app.json에 다음과 같이 plugin을 추가해주면 설정 완료.

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/messaging"
    ]
  }
}
```

## 2. React-Native(EXPO) 앱에 적용

### 2-1. FCM Token

이제 기기에 할당된 FCM Token을 서버로 보내보자.

```typescript
import messaging from "@react-native-firebase/messaging";

// ...

  const requestUserPermission = useCallback(async () => {
    if (Platform.OS === "ios") {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      return enabled;
    }
    return true;
  }, []);

  const getFCMToken = useCallback(async () => {
    try {
      const hasPermission = await requestUserPermission();
      if (!hasPermission) {
        throw new Error("No permission for push notifications");
      }

      const token = await messaging().getToken();
      await sendTokenToServer(token);
      return token;
    } catch (error) {
      console.error("Error getting FCM token:", error);
      throw error;
    }
  }, [...]);

```

우선 `messaging`을 활용해 권한 관리 및 토큰 취득이 가능하다.

`messaging().requestPermission()` 메서드를 활용해 접근 권한을 확인한 후, 권한이 존재할 경우 FCM Token을 get해서 서버에 보낸다.

이 때는 `messaging().getToken()` 메서드를 활용하면 쉽게 토큰 값을 얻을 수 있다.

### 2-2. Message Handling

이렇게 서버에 보낸 토큰들을 대상으로 서버에서 FCM에 API를 요청한다.

[FCM API 요청 문서](https://firebase.google.com/docs/cloud-messaging/send-message?hl=ko&authuser=0&_gl=1*1s51xiy*_up*MQ..*_ga*NjM0MzgzOTc5LjE3MzQ2MjM5MjU.*_ga_CW55HF8NVT*MTczNDYyMzkyNS4xLjAuMTczNDYyMzkyNS4wLjAuMA..)

FCM은 해당 요청을 바탕으로 각 디바이스에 메시지를 보내고, 우리는 그 메시지를 캐치해야한다.

```typescript
// index.tsx

import { registerRootComponent } from "expo";
import messaging from "@react-native-firebase/messaging";
import App from "./App";

// 백그라운드 메시지 핸들러
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("Background Message received:", remoteMessage);
});

// 포그라운드 메시지 핸들러
messaging().onMessage(async (remoteMessage) => {
  console.log("Foreground Message received:", remoteMessage);
});

registerRootComponent(App);
```

이런식으로 앱 최상단에 리스너를 추가해 포그라운드/백그라운드 메시지를 핸들링 할 수 있다.

## 3. 내가 만난 이슈들

### 3-1. EAS 빌드시 GoogleService-Info.plist를 못찾는 이슈

```bash
Build failed: The "Run fastlane" step failed because of an error in the Xcode build process. We automatically detected following errors in your Xcode build logs:
- Build input file cannot be found: '/Users/expo/workingdir/build/ios/myProject/GoogleService-Info.plist'. Did you forget to declare this file as an output of a script phase or custom build rule which produces it?
```

가장 애먹고 오랜 시간을 할애했던 이슈...

분명히 내 레포에는 `GoogleService-Info.plist` 파일이 있는데, 빌드를 하면 해당 파일을 찾지 못하는 이슈가 발생했다.

그렇게 십 수번의 수정과 재빌드(EAS는 무료 빌드 리밋이 있으니 신중하게 빌드하세요!)... 머리털이 몽땅 빠질 때 즘, 이번에도 github issues가 나에게 해답을 주었다.

(참고: https://github.com/expo/eas-cli/issues/2199)

.gitignore에 해당 파일이 저장되어 있으면 EAS에서 해당 파일을 접근하지 못해 찾지 못하는 것이었다...

결국 gitignore에 해당 파일을 제외하고 나니 성공적으로 실행되었다.

### 3-2. The Swift pod FirebaseCoreInternal depends upon GoogleUtilities

해당 이슈는 FCM을 react-native에 적용하는 이들이 자주 맞닥뜨리는 에러이다.

이 에러는 `CocoaPods`를 사용하여 의존성을 관리하는 Swift 프로젝트에서 발생하는 모듈 헤더 설정과 관련된 문제다.

즉, `GoogleUtilities`와 같은 일부 라이브러리가 모듈화를 지원하지 않는 방식으로 설정되어 있기 때문에 Swift에서 정상적으로 임포트할 수 없는 상황이다.

구글에 검색해보면 Podfile에 `pod 'GoogleUtilities', :modular_headers => true`라는 명령어를 적으라고 하지만, Podfile을 직접 건드릴 수 없는 EAS 빌드 하에서는 다른 방식으로 해결해야 한다.

(참고: https://github.com/invertase/react-native-firebase/issues/8051)

바로 `expo-build-properties` 라이브러리를 설치하여 적용해주면 된다.

https://docs.expo.dev/versions/latest/sdk/build-properties/

```bash
$ npx expo install expo-build-properties
```

패키지 인스톨 후 app.json에 다음과 같이 추가해주면 끝이다.

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```

### 3-3. messageSendError: Auth error from APNS or Web Push Service

FCM에 APNs(Apple Push Notification service) 키 값이 등록되지 않았기 때문에 발생하는 에러이다.

만약 APNs 키 값이 파일 형태로 존재한다면(.p8) 해당 파일을 FCM 콘솔에 등록해주자.

아마 EAS 빌드를 사용했다면... p8 파일이 존재하지 않을 가능성이 크다. (지멋대로 내 Apple 계정에 등록해버렸기 때문)

그럴때는 APNs Key를 새로 발급 받아서 EAS Credential과 FCM 콘솔에 모두 등록해주면 된다.

> APNs Key 생성 및 EAS 등록 방법

우선 Apple Developer 콘솔에 접속해 Certificates, Identifiers & Profiles > Keys 페이지에 들어가자. (https://developer.apple.com/account/resources/authkeys/list)

![](https://velog.velcdn.com/images/hayou/post/879ee501-adc4-48b4-92af-2a162db92644/image.png)

Key Name을 작성하고, APNs 옵션을 체크해서 만들어주면 끝이다.

APNs이 적용된 Key는 최대 2개인 듯 하다. 만약 사용하지 않는 키가 있다면 삭제해서 만들어주자.

이렇게 만들어진 Key 파일을 (.p8) 잘 저장해놓고, 프로젝트로 돌아오자.

```bash
$ eas credentials
```

터미널에 해당 명령어를 작성해 EAS credentials 메뉴에 접근하자.

- `Select platform` > `iOS`
- `Which build profile do you want to configure?` > `production` (적용 환경)

![](https://velog.velcdn.com/images/hayou/post/0f548cdd-05c8-4a78-8ef1-ab2ff0f7076f/image.png)

이후 Apple Developer 로그인을 요청하는데, 기존에 EAS 빌드를 해보았던 분들이라면 이미 다 작성되어 있을 것이다.

- `What do you want to do?` > `Push Notifications: Manage your Apple Push Notifications Key`

이후 나오는 선택지에서는, 기존 key가 존재할 경우 Remove, key가 없는 상태일 경우 Add a new push Key를 활용해 P8 파일을 업로드 해주면 된다.

![](https://velog.velcdn.com/images/hayou/post/b9f1f258-4337-4daa-8427-fc6a866b0ce7/image.png)

이후 `press any key to continue`가 나오면 EAS에 등록 완료된 것이다.

> FCM 콘솔에 APN 인증 키 등록 방법

프로젝트 개요 > 프로젝트 설정 > 클라우드 메시징 > Apple 앱 구성 > APN 인증 키 > 등록

![](https://velog.velcdn.com/images/hayou/post/61d78738-aa7f-4f69-a11f-93862e187be7/image.png)

이 때 .p8 파일 뿐 아니라 팀ID와 Key ID도 작성해야하니, 잊지 말고 잘 적어두자. (Apple Developer 콘솔에서 확인 가능)

## 4. 마치며

이번 경험은 Expo와 React-Native, 그리고 FCM의 구조를 보다 깊이 이해할 수 있었던 값진 시간이었다.

여러 시행착오와 구글링의 반복으로 문제를 해결해 나가는 과정이 비록 힘들었지만, 결과적으로는 개발자로서 한 단계 성장할 수 있는 계기가 되었다.

이 글이 비슷한 문제를 겪고 있는 분들에게 조금이나마 도움이 되기를 바란다.
