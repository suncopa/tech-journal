## 프로젝트에 적용하기

앞서 학습한 내용을 바탕으로 프로젝트에 직접 적용해보았다.

---

### Provider 만들기

우선 전역에서 DB에 접근할 수 있게 만들기 위해 Context로 선언해주었다.
Context.Provider를 생성해 db를 전역으로 접근 가능하게 만들었다.


```ts
// .../hooks/useIndexedDB.ts
import { useState, useEffect } from 'react';

type UseIndexedDBPropsType = {
  dbName: string;
  storeName: string;
};

const useIndexedDB = ({ dbName, storeName }: UseIndexedDBPropsType) => {
  const [db, setDb] = useState<IDBDatabase>();

  useEffect(() => {
    const request = indexedDB.open(dbName);

    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      db.createObjectStore(storeName, { keyPath: 'popupId' });
    };

    request.onsuccess = () => {
      setDb(request.result);
    };

    request.onerror = () => {
      console.error('Error opening database:');
    };
  }, [dbName, storeName]);

  return db;
};

export default useIndexedDB;

```

```ts
// .../IndexedDBProvider.ts
import React, { ReactNode, createContext, useEffect, useState } from 'react';
import useIndexedDB from './hooks/useIndexedDB';

export const IndexedDBContext = createContext<IDBDatabase | undefined>(undefined);

export function IndexedDBProvider({ children }: { children: ReactNode }) {
  const dbName = 'PopupDB';
  const storeName = 'Message';
  const db = useIndexedDB({ dbName, storeName });
  const [isIndexedDBSupported, setIsIndexedDBSupported] = useState(true);

  useEffect(() => {
    if (!window.indexedDB) {
      setIsIndexedDBSupported(false);
    }
  }, []);

  if (!isIndexedDBSupported) return <>{ children }</>;

  return <IndexedDBContext.Provider value={db}>{children}</IndexedDBContext.Provider>;
}

```

### customHook을 활용해 data handler 만들기
```ts
const useCustomHook = <T>({...}) => {
  
  const db = useContext(IndexedDBContext);

  const [popupValue, setPopupValue] = useState<T | undefined>();
  const [parentValue, setParentValue] = useState<any>();

  const { ..., popupId } = popupId_불러오는_로직;

  ...
  
  const setData = async (popupId: string, data?: any) => {
    if (!db) {
      return localStorage.setItem(popupId, JSON.stringify(data ?? ''));
    }

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('Message', 'readwrite');
      const store = transaction.objectStore('Message');
      const request = store.add({ popupId, data: data ?? '' });

      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
      transaction.oncomplete = () => console.log('Transaction completed');
      transaction.onerror = () => reject(transaction.error);
    });
  };

  const getData = async (popupId: string) => {
    if (!db) {
      return safelyParseJSON(localStorage.getItem(popupId)) || null;
    }

    return new Promise(resolve => {
      const transaction = db.transaction('Message', 'readonly');
      const store = transaction.objectStore('Message');
      const getReq = store.get(popupId);

      getReq.onsuccess = () => {
        resolve(getReq.result ? getReq.result.data : null);
      };

      getReq.onerror = () => {
        resolve(null);
      };
    });
  };

  const deleteData = (popupId: string) => {
    if (!db) {
      localStorage.removeItem(popupId);
      return;
    }

    const store = db.transaction('Message', 'readwrite').objectStore('Message');
    store.delete(popupId);
  };
  
  useEffect(() => {
    const fetchData = async () => {
      const data = await getData(popupId);
      setParentValue(data);
    };

    if (popupId) {
      fetchData();
    }
  }, [popupId]);  
};
```
---

### 적용 결과
서로 다른 iframe에서 CRUD 테스트를 진행해보았고, 정상적으로 동작함을 확인하였다. 하지만 몇 가지 문제가 있었는데...

---

### 문제점
#### 1. 기존에 넘겨주던 값이 state로 변경되어 undefined 상태를 뱉을 때가 있다..!

suspense를 적용해보려했음. but 해당 값을 사용하지 않는데도 suspense를 필요로 함.. -> 너무 많은 코드가 변경되어야 함

react-query의 useQuery로 감싸면? 여전히 state로 관리 됨 -> useSuspenseQuery라는 놈을 써볼까 했지만 현재 사용하는 r-q의 버전은 v4...!

결국은 각 parentValue를 사용하는 곳에서 처리하도록 코드의 여러 부분을 수정하였다.

---

#### 2. 기존 요구사항인 함수가 넘어가지 않는다...!
![](https://velog.velcdn.com/images/hayou/post/fa1f703f-5b0d-4521-abb4-422f7ff521fc/image.png)

Javascript 함수는 일급 객체가 아닌가? 모든 객체를 저장할 수 있다고 알았는데??

검색해본 결과, IndexedDB는 Javascript에서 사용 가능한 모든 자료형이 아닌 '직렬화 가능한' 자료형 뿐이었다.

Javascript의 경우, 일급 객체이지만 직렬화할 수 없는 객체이기 때문에 지원이 안된다.

직렬화 가능한 객체는 다음과 같다..
https://developer.mozilla.org/ko/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types

흑흑. 결국 난 커다란 로컬 스토리지를 가진 사람이 되었다.

---

### 배운점

우선 기술을 제대로 공부하지 않고 바로 적용한다는 것에 대해 경계하게 되었다. 
앞으로는 사용할 기술이 정확히 요구사항을 해결하는데 도움이 되는지, 또한 해당 방식이 최선인지 더욱 면밀히 검토하고 프로젝트에 적용해야겠다.