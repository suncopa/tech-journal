interface FlyStrategy {
  fly: () => void;
}

class FlyWithWings implements FlyStrategy {
  fly() {
    console.log("날개로 날아갑니다.");
  }
}

class FlyNoWay implements FlyStrategy {
  fly() {
    console.log("날 수 없습니다.");
  }
}

class Duck {
  flyStrategy: FlyStrategy = new FlyWithWings();
  quack() {
    console.log("꽥꽥");
  }
  fly() {
    this.flyStrategy.fly();
  }
}

class MallardDuck extends Duck {
  constructor() {
    super();
    this.flyStrategy = new FlyWithWings();
  }
}

class RubberDuck extends Duck {
  constructor() {
    super();
    this.flyStrategy = new FlyNoWay();
  }
}
