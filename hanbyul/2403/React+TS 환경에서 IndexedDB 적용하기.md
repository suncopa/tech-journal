![](https://velog.velcdn.com/images/hayou/post/561181e5-cc6d-4afd-bdba-260f114fed8b/image.png)

## 도입계기

사내 프로젝트의 2차 릴리즈를 준비하는 과정에서 iframe 간 통신의 요구사항이 고도화되며 기존 방식인 localStorage만으로 100% 구현할 수 없는 상황이 되었다.

localStorage의 특성상 문자열만을 저장할 수 있기 때문에, json 형식의 데이터나 콜백 함수 등 요구사항을 모두 구현하는데 불편함이 있었다.

이를 해결하기 위한 대안으로 indexedDB를 적용하게 되었고, 학습 내용과 적용 과정을 기록해보았다.

---

## IndexedDB 개념
![](https://velog.velcdn.com/images/hayou/post/d3faa66b-3214-463f-b4ac-b6d01b8d0f13/image.png)
이미지 출처 - [생활코딩](https://youtu.be/mHJDtDM_wHc?si=Irg9TVWGpXaQKEEu)

IndexedDB란 브라우저에서 제공하는 데이터베이스이다.

Cookie와 LocalStorage와는 다르게 대용량의 데이터를 저장할 수 있고, 다양한 데이터 타입을 기록할 수 있기 때문에 다양하게 활용할 수 있다.

뿐만 아니라 비동기식으로 동작하기 때문에 다른 방식들에 비해 뛰어난 성능까지 기대할 수 있다.

---

## IndexedDB의 구조
IndexedDB는 다음과 같은 구조를 가진 Database이다.

![](https://velog.velcdn.com/images/hayou/post/4be93e90-40f9-4e57-b560-a140b14e9a9c/image.png)
이미지 출처 - [생활코딩](https://youtu.be/mHJDtDM_wHc?si=Irg9TVWGpXaQKEEu)

이러한 구조를 갖기 때문에, 사용자가 원하는 Object를 만들어서 저장하기 위해서는

- Database를 생성한뒤,
- transaction을 통해 내가 사용할 Object의 묶음인 ObjectStore을 Database에 생성해주고,
- 필요한 Object를 만들어 사용하면 된다!

<br>

하위 내용은 생활코딩 강의와 MDN 문서를 보며 react + typescript 환경에 맞게 실습한 간단한 예시와 프로젝트에 적용한 코드의 일부이다.

---

## IndexedDB 생성

### 1. DataBase 생성
```ts
  // Open IndexedDB
  const request = indexedDB.open("userDB", 1);
  let db: IDBDatabase;

  request.onerror = () => {
    alert("IndexedDB Open Error!");
  };

  request.onsuccess = () => {
    db = request.result;
  };
```

indexedDB에 database를 생성할 때 name과 version 2개의 인자가 필요하다.
`(name: string, version?: number | undefined)`
name은 말그대로 database의 이름이고, version은 해당 database의 버전을 관리하기 위해 필요한 값이다.


### 2. ObjectStore 생성
```ts
  // Create ObjectStore 
  request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
    const upgradeDb = (event.target as IDBOpenDBRequest).result;
    const objectStore = upgradeDb.createObjectStore("user", { keyPath: "id", autoIncrement: true });
    objectStore.createIndex("email", "email", { unique: true });
  };
  
```
onupgradeneeded는 version이 변경될 때마다 동작한다.
이 코드에서는 처음 생성될 때 version 1이 할당되면서 단 한 번 callback 함수를 실행한다.
이 특성을 활용해 내가 사용할 objectStore을 create 하는 callback 함수를 작성했다.
createObjectStore은 총 2개의 인자를 받는다. 
`(name: string, options?: IDBObjectStoreParameters | undefined)` 
keyPath란 key로 사용할 객체 프로퍼티이고, autoIncrement를 활용해 자동으로 늘어나는 key 값을 만들어주었다.
또한 createIndex 메서드를 활용해 email을 index로 적용해주었다.

---

## IndexedDB CRUD

### 1. Add
```ts
  // Add Data
  const addBtnHandler = () => {
    if(!userData.age || !userData.email || !userData.name) return alert("입력값을 모두 채워주세요");
    const store = db.transaction("user", "readwrite").objectStore("user");
    const addReq = store.add(userData);
    addReq.onsuccess = () => {
      console.log("Add Success!");
      setUserData(DEFAULT_USER_DATA);
    };
  };
```

입력값을 받아 db에 data를 create 해보자.
우선 transaction을 통해 어느 objectStore에 어떤 mode로, 접근할지 작성한다.
mode는 'readwrite'와 'readonly' 두가지가 있다.
나는 새 데이터를 추가할 것이기 때문에 readwrite 옵션을 통해 add 메서드를 수행하도록 작성했다.


### 2. Get / GetAll
다음은 db에 기록된 데이터를 get 해오자.
우선 내가 구현한 get 방식은 총 3가지이다.
- key를 통한 get
- index를 통한 get
- 전체 data get

```ts
  // Get Data by Key
  const getByIdBtnHandler = () => {
    const id = Number(prompt("ID를 입력하세요"));
    const store = db.transaction("user", "readonly").objectStore("user");
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result as UserDataType) {
        console.log("Get Success!");
        setUserGetData([getReq.result]);
        return;
      }
      return alert("해당 ID가 존재하지 않습니다."); 
    };
    getReq.onerror = () => {
      alert("해당 ID가 존재하지 않습니다."); 
    };
  };
```
key를 통한 get은 간단하다.
transaction 구문을 작성한 뒤 get 메서드를 활용해 특정 key 값을 불러온다.
<br>

```ts
  // Get Data by Index
  const getByIndexBtnHandler = () => {
    const email = prompt('Email을 입력하세요')!;
    const store = db.transaction("user", "readonly").objectStore("user");
    const index = store.index("email");
    const getReq = index.get(email);
    getReq.onsuccess = () => {
      if (getReq.result as UserDataType) {
        console.log("Get Success!");
        setUserGetData([getReq.result]);
        return;
      }
      return alert("해당 이메일을 가진 사용자를 찾을 수 없습니다."); 
    };
  };
```
index를 활용한 get 방식이다.
앞서 email을 index로 만들어주었기 때문에, 해당 값을 활용해 get을 해올 수 있다.
<br>

```ts
  // Get All Data 
  const getAllBtnHandler = () => {
    const store = db.transaction("user", "readonly").objectStore("user");
    const getReq = store.getAll();
    getReq.onsuccess = () => {
      if (getReq.result as Array<UserDataType>) {
        console.log("Get Success!");
        setUserGetData(getReq.result);
        return;
      };
      return alert("데이터가 존재하지 않습니다."); 
    };
  };
```
마지막으로 getAll 메서드를 활용해 모든 data를 조회해올 수 있다.
하지만 data 양이 커질수록 부하가 올 수 있기 때문에 IDBCursor를 활용해 Pagination한 data를 불러오는 것이 권장된다.


### 3. PUT
```ts
  // Update Data
  const updatedBtnHandler = () => {
    const store = db.transaction("user", "readwrite").objectStore("user");
    const putReq = store.put({...userUpdateData, id: +userUpdateData.id});
    putReq.onsuccess = () => {
      alert('데이터가 수정되었습니다.'); 
    };
    putReq.onerror = () => {
      alert('입력한 ID가 존재하지 않습니다.'); 
    };
  };
```

Data를 수정하는 것은 어렵지 않다.
Put 메서드에 데이터 형식만 매치시키면 손쉽게 변경이 가능하다.


### 4. Delete
```ts
  // Delete Data
  const deleteBtnHandler = () => {
    const id = prompt('삭제할 ID를 입력하세요')!
    const store = db.transaction("user", "readwrite").objectStore("user");
    const deleteReq = store.delete(+id);
    deleteReq.onsuccess = () => {
      alert('데이터가 삭제되었습니다.'); 
    };
    deleteReq.onerror = () => {
      alert('입력한 ID가 존재하지 않습니다.'); 
    };
  };
```
삭제 또한 key 값을 활용해 삭제할 수 있다.

---

## 전체 코드
[전체 코드 확인하기](https://github.com/hanbeulYou/indexedDB-practice)

---

<strong>그리고 앞으로 할 일...</strong>

## 프로젝트에 적용하기

#### 1. Provider 만들기

#### 2. customHook을 활용해 data handler 만들기

