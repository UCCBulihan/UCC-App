import './card_button.css'
import {cards} from './cards'


function Cards() {
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
              <a href={card.href} className="card-btn">{card.label}</a>
            </div>

          </div>
        </div>
      ))}
    </div>
  )
}

export default Cards