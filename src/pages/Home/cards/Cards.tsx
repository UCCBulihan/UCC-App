
import './card_button.css'
import {cards} from './cards.ts'
import { useNavigate } from "react-router-dom";


function Cards() {
  const navigate = useNavigate();

  const handlePledges = () => {
    navigate("/pledges");
  }

    return (
    <div className="card-grid">
      {cards.map((card) => (
        <div className="card" key={card.id}>
          <div className="card-inner">

            <div className="card-icon">
              <i className={`fa-solid ${card.icon}`}></i>
            </div>

            <div className="card-body">
              <h3 className="card-title">{card.title}</h3>
              <p className="card-text">{card.text}</p>

                <button className="card-btn" onClick={()=> navigate(card.to)}>
                  {card.label}
                </button>

            </div>

          </div>
        </div>
      ))}
    </div>
  )
}

export default Cards