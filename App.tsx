import { useState, useEffect } from "react";

export default function App() {
  const [mode, setMode] = useState<"A" | "B" | null>(null);
  const [items, setItems] = useState<(number | string)[]>([]);
  const [current, setCurrent] = useState(0);
  const [errors, setErrors] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);

  const getSequence = () => {
    if (mode === "A") {
      return Array.from({ length: 9 }, (_, i) => i + 1);
    } else {
      const numbers = [1, 2, 3, 4, 5];
      const letters = ["A", "B", "C", "D", "E"];
      return numbers.flatMap((n, i) => [n, letters[i]]);
    }
  };

  const startTest = (selected: "A" | "B") => {
    setMode(selected);
    const seq = selected === "A"
      ? Array.from({ length: 9 }, (_, i) => i + 1)
      : [1, "A", 2, "B", 3, "C", 4, "D", 5, "E"];

    setItems([...seq].sort(() => Math.random() - 0.5));
    setCurrent(0);
    setErrors(0);
    setStart(null);
    setEnd(null);
  };

  const handleClick = (item: number | string) => {
    const seq = getSequence();

    if (!start) setStart(Date.now());

    if (item === seq[current]) {
      if (current === seq.length - 1) {
        setEnd(Date.now());
      }
      setCurrent(current + 1);
    } else {
      setErrors(errors + 1);
    }
  };

  const time =
    start && end ? ((end - start) / 1000).toFixed(2) : null;

  return (
    <div style={styles.container}>
      {!mode && (
        <div style={styles.card}>
          <h1>🧠 TMT Trainer</h1>
          <p>اختبار تتبع المسار - جامعة العريش</p>

          <button style={styles.btn} onClick={() => startTest("A")}>
            Part A (أرقام)
          </button>

          <button style={styles.btn} onClick={() => startTest("B")}>
            Part B (أرقام + حروف)
          </button>
        </div>
      )}

      {mode && (
        <div style={styles.card}>
          <h2>ابدأ التتبع</h2>

          <div style={styles.grid}>
            {items.map((item, i) => (
              <button key={i} onClick={() => handleClick(item)} style={styles.cell}>
                {item}
              </button>
            ))}
          </div>

          {time && (
            <>
              <h3>⏱ {time} ثانية</h3>
              <h3>❌ الأخطاء: {errors}</h3>
            </>
          )}

          <button style={styles.btn} onClick={() => setMode(null)}>
            إعادة
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0A192F",
    color: "#fff",
    direction: "rtl" as const,
  },
  card: {
    background: "#112240",
    padding: "30px",
    borderRadius: "15px",
    textAlign: "center" as const,
  },
  btn: {
    margin: "10px",
    padding: "10px 20px",
    background: "#00A8E8",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "8px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 60px)",
    gap: "10px",
    justifyContent: "center",
    marginTop: "20px",
  },
  cell: {
    padding: "15px",
    fontSize: "18px",
    cursor: "pointer",
  },
};
