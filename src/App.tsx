import styles from './App.module.css';
import DrumSequencer from './DrumSequencer';


function App() {
  return (
    <div className={styles.rootWrap}>
      <div className={styles.logo}>LOGO</div>
      <DrumSequencer />
    </div>
  )
}

export default App
