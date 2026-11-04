import './css/start.css'
export default function StartPage({nickname, setNickname, onJoin}) {
        // js goes here

  function handleChange(e) {
    setNickname(e.target.value);
  }
  return (
    <section className="start-scene">
      <div>START PAGE</div>
      <div>
        <form onSubmit={onJoin}>
        <label>Enter your name:
          <input 
          type="text" 
          value={nickname}
          onChange={handleChange}
          placeholder="Enter your name here"
          />
        </label>
        <button type="submit">Enter Game</button>
      </form>
    </div>
    </section>
  );
}