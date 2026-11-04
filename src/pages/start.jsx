import "./css/start.css";
import titlesvg from "/assets/title.svg";
import bg from "/assets/background.png";

export default function StartPage({ nickname, setNickname, onJoin }) {
  // js goes here

  function handleChange(e) {
    setNickname(e.target.value);
  }
  return (
    <div className="start-wrapper">
      <div className="start-bg-layer" style={{ backgroundImage: `url(${bg})` }}></div>
      <section className="start-scene">
        <div className="title-container">
          <img src={titlesvg} alt="Game Title" className="start-title-img" />
        </div>
        {/* <div>START PAGE</div> */}
        <div>
          <form onSubmit={onJoin}>
            <label>
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
    </div>
  );
}