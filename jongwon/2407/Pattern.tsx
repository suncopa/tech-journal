const React = require('react');

// 정렬 전략 인터페이스
interface SortStrategy {
    sort: (data) => number[];
}

// 버블 정렬 구현
class BubbleSort implements SortStrategy {
    sort(data) {
        let arr = [...data];
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr.length - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                }
            }
        }
        return arr;
    }
}

// 퀵 정렬 구현
class QuickSort implements SortStrategy {
    sort(data) {
        if (data.length <= 1) return data;
        let pivot = data[0];
        let left = data.slice(1).filter(x => x < pivot);
        let right = data.slice(1).filter(x => x >= pivot);
        return [...this.sort(left), pivot, ...this.sort(right)];
    }
}

const SortContext = ({ strategy }) => {
    const [data, setData] = React.useState([5, 3, 8, 1, 2, 7]);

    const handleSort = () => {
        const sortedData = strategy.sort(data);
        setData(sortedData);
    };

    return (
        <div>
            <h2>Data: {data.join(", ")}</h2>
            <button onClick={handleSort}>Sort</button>
        </div>
    )
}

const App = () => {
    const [strategy, setStrategy] = React.useState(new BubbleSort());

    const handleStrategyChange = (e) => {
        const selectedStrategy = e.target.value;
        if (selectedStrategy === "bubble") {
            setStrategy(new BubbleSort());
        } else if (selectedStrategy === "quick") {
            setStrategy(new QuickSort());
        }
    };

    return (
        <div>
            <h1>Sort Example with Strategy Pattern</h1>
            <select onChange={handleStrategyChange}>
                <option value="bubble">Bubble Sort</option>
                <option value="quick">Quick Sort</option>
            </select>
            <SortContext strategy={strategy} />
        </div>
    );
}