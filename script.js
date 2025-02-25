// script.js

// FUNCIONES DE UTILIDAD PARA LA "CONSOLa"
function log(message) {
    const consoleDiv = document.getElementById("gameConsole");
    consoleDiv.innerHTML += message + "<br>";
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
  }
  
  // Función para mostrar un input y esperar la respuesta del usuario.
  // Ahora se añade un listener para que se pueda enviar pulsando Enter y se fuerza el foco al input.
  function promptUser(message) {
    return new Promise((resolve) => {
      const inputArea = document.getElementById("inputArea");
      inputArea.innerHTML = `
        <label>${message}</label>
        <input type="text" id="userInput" autofocus />
        <button id="submitBtn">Enviar</button>
      `;
      // Forzamos el foco en el input inmediatamente
      const inputField = document.getElementById("userInput");
      inputField.focus();
      const submitButton = document.getElementById("submitBtn");
      // Permitir enviar con la tecla Enter
      inputField.addEventListener("keyup", function(event) {
        if (event.key === "Enter") {
          submitButton.click();
        }
      });
      submitButton.onclick = function () {
        let input = inputField.value;
        inputArea.innerHTML = "";
        log(`> ${input}`);
        resolve(input);
      };
    });
  }
  
  // CLASES DEL JUEGO
  
  // Clase Carta
  class Card {
    constructor(value, suit) {
      this.value = value; // 1 a 13 (1 = As, 11 = J, 12 = Q, 13 = K)
      this.suit = suit; // "CORAZONES", "DIAMANTES", "TREBOLES", "PICAS"
      this.asAlto = false; // Por defecto, el As vale 1
    }
    getSuitSymbol() {
      switch (this.suit) {
        case "CORAZONES": return "♥";
        case "DIAMANTES": return "♦";
        case "TREBOLES": return "♣";
        case "PICAS": return "♠";
        default: return "";
      }
    }
    toString() {
      let valStr;
      if (this.value === 1) valStr = "A";
      else if (this.value === 11) valStr = "J";
      else if (this.value === 12) valStr = "Q";
      else if (this.value === 13) valStr = "K";
      else valStr = this.value.toString();
      return `${valStr} ${this.getSuitSymbol()}`;
    }
    getHierarchyValue() {
      let cardValue = (this.value === 1 && this.asAlto) ? 12 : this.value;
      let suitValue = 0;
      switch (this.suit) {
        case "CORAZONES": suitValue = 4; break;
        case "DIAMANTES": suitValue = 3; break;
        case "TREBOLES": suitValue = 2; break;
        case "PICAS": suitValue = 1; break;
      }
      return cardValue + suitValue * 100;
    }
  }
  
  // Función para crear y barajar la baraja
  function createDeck() {
    const suits = ["CORAZONES", "DIAMANTES", "TREBOLES", "PICAS"];
    let deck = [];
    for (let suit of suits) {
      for (let value = 1; value <= 13; value++) {
        deck.push(new Card(value, suit));
      }
    }
    // Barajado (algoritmo Fisher–Yates)
    for (let i = deck.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
  
  // Clase Jugador
  class Player {
    constructor(name, isHuman = false) {
      this.name = name;
      this.isHuman = isHuman;
      this.hand = [];
      this.lives = 5;
      this.bet = 0;
      this.wins = 0;
    }
    // Al jugar un As, se decide si vale 1 o 12
    chooseAceValue(card) {
      if (!this.isHuman) {
        if (this.wins < this.bet) {
          card.asAlto = true;
          log(`${this.name} elige que el As valga 12.`);
        } else {
          card.asAlto = false;
          log(`${this.name} elige que el As valga 1.`);
        }
        return Promise.resolve();
      } else {
        return promptUser(`${this.name}, ¿qué valor deseas para el As? (1 o 12): `)
          .then(answer => {
            let val = parseInt(answer);
            card.asAlto = (val === 12);
          });
      }
    }
    // Realiza la apuesta
    // Se agrega el parámetro opcional visibleCards para la ronda final
    makeBet(round, cardsPerPlayer, totalBetSoFar, visibleCards = null) {
      if (!this.isHuman) {
        // Lógica de la IA para apostar:
        if (this.hand.length === 1) {
          // Ronda final: apuesta 0 o 1 según la calidad de la carta
          if ((this.hand[0].value >= 7 ||
              ["CORAZONES", "DIAMANTES"].includes(this.hand[0].suit))
              && Math.random() > 0.3)
            this.bet = 1;
          else
            this.bet = 0;
        } else {
          let estimated = estimateWins(this.hand);
          // Si la mano es débil o por azar, se apuesta 0
          if (estimated < 1 || Math.random() < 0.25) {
            this.bet = 0;
          } else {
            if (this.hand.length >= 5) estimated = Math.min(estimated, 3);
            else if (this.hand.length === 4) estimated = Math.min(estimated, 2);
            else if (this.hand.length === 3) estimated = Math.min(estimated, 2);
            else if (this.hand.length === 2) estimated = Math.min(estimated, 1);
            this.bet = estimated;
            if (Math.random() < 0.2) this.bet = Math.max(0, this.bet - 1);
            else if (Math.random() > 0.8) this.bet = this.bet + 1;
          }
        }
        // Restricción para el último jugador: la suma total de apuestas no puede ser igual a cardsPerPlayer
        if (totalBetSoFar !== null && totalBetSoFar + this.bet === cardsPerPlayer) {
          if (totalBetSoFar + (this.bet + 1) !== cardsPerPlayer)
            this.bet = this.bet + 1;
          else if (this.bet > 0 && totalBetSoFar + (this.bet - 1) !== cardsPerPlayer)
            this.bet = this.bet - 1;
        }
        log(`${this.name} apuesta: ${this.bet}`);
        return Promise.resolve();
      } else {
        // Para el jugador humano:
        // Si tiene más de 1 carta, se muestra la mano; en la ronda final (1 carta), se muestra la advertencia y las cartas de los demás.
        if (this.hand.length > 1) {
           displayHand(this.hand);
        } else if (visibleCards) {
           let others = "";
           for (let key in visibleCards) {
             if (key !== this.name) {
               others += `${key}: ${visibleCards[key].toString()}<br>`;
             }
           }
           log(`¡Tu carta está en la frente y no puedes verla!<br>Cartas visibles de otros jugadores:<br>${others}`);
        }
        let promptMsg = `${this.name}, ingresa tu apuesta (número entero ≥ 0, no puede hacer que la suma sea ${cardsPerPlayer}): `;
        return promptUser(promptMsg).then(answer => {
          let b = parseInt(answer);
          if (isNaN(b) || b < 0 || (totalBetSoFar !== null && totalBetSoFar + b === cardsPerPlayer)) {
            log("Apuesta inválida. Intenta de nuevo.");
            return this.makeBet(round, cardsPerPlayer, totalBetSoFar, visibleCards);
          } else {
            this.bet = b;
          }
        });
      }
    }
    // Elegir la carta a jugar en el turno
    chooseCard(cardsPlayed, isFirst, isLast) {
      if (this.hand.length === 1) {
        log(`${this.name} juega su única carta automáticamente.`);
        return Promise.resolve(0);
      }
      if (!this.isHuman) {
        let chosenCard;
        // Si apostó 0, desea perder
        if (this.bet === 0) {
          if (isFirst) {
            chosenCard = this.hand.reduce((min, card) =>
              card.getHierarchyValue() < min.getHierarchyValue() ? card : min, this.hand[0]);
          } else {
            let currentMax = cardsPlayed.reduce((max, card) =>
              card.getHierarchyValue() > max.getHierarchyValue() ? card : max, cardsPlayed[0]);
            let losingOptions = this.hand.filter(card =>
              card.getHierarchyValue() < currentMax.getHierarchyValue());
            if (losingOptions.length > 0)
              chosenCard = losingOptions.reduce((max, card) =>
                card.getHierarchyValue() > max.getHierarchyValue() ? card : max, losingOptions[0]);
            else
              chosenCard = this.hand.reduce((min, card) =>
                card.getHierarchyValue() < min.getHierarchyValue() ? card : min, this.hand[0]);
          }
        }
        // Si necesita ganar (wins < bet)
        else if (this.wins < this.bet) {
          if (isFirst) {
            let sorted = this.hand.slice().sort((a, b) => a.getHierarchyValue() - b.getHierarchyValue());
            chosenCard = sorted[Math.floor(sorted.length / 2)];
          } else {
            let currentMax = cardsPlayed.reduce((max, card) =>
              card.getHierarchyValue() > max.getHierarchyValue() ? card : max, cardsPlayed[0]);
            let winningOptions = this.hand.filter(card =>
              card.getHierarchyValue() > currentMax.getHierarchyValue());
            if (winningOptions.length > 0)
              chosenCard = winningOptions.reduce((min, card) =>
                card.getHierarchyValue() < min.getHierarchyValue() ? card : min, winningOptions[0]);
            else
              chosenCard = this.hand.reduce((min, card) =>
                card.getHierarchyValue() < min.getHierarchyValue() ? card : min, this.hand[0]);
          }
        }
        // Si ya cumplió la apuesta (o no necesita ganar), quiere perder el turno
        else {
          if (isFirst) {
            chosenCard = this.hand.reduce((min, card) =>
              card.getHierarchyValue() < min.getHierarchyValue() ? card : min, this.hand[0]);
          } else {
            let currentMax = cardsPlayed.reduce((max, card) =>
              card.getHierarchyValue() > max.getHierarchyValue() ? card : max, cardsPlayed[0]);
            let losingOptions = this.hand.filter(card =>
              card.getHierarchyValue() < currentMax.getHierarchyValue());
            if (losingOptions.length > 0)
              chosenCard = losingOptions.reduce((max, card) =>
                card.getHierarchyValue() > max.getHierarchyValue() ? card : max, losingOptions[0]);
            else
              chosenCard = this.hand.reduce((min, card) =>
                card.getHierarchyValue() < min.getHierarchyValue() ? card : min, this.hand[0]);
          }
        }
        return Promise.resolve(this.hand.indexOf(chosenCard));
      } else {
        // Turno del jugador humano: se muestra la mano y se pide elegir
        displayHand(this.hand);
        return promptUser(`${this.name}, elige una carta (1-${this.hand.length}): `)
          .then(answer => {
            let idx = parseInt(answer) - 1;
            if (isNaN(idx) || idx < 0 || idx >= this.hand.length) {
              log("Selección inválida. Intenta de nuevo.");
              return this.chooseCard(cardsPlayed, isFirst, isLast);
            }
            return idx;
          });
      }
    }
  }
  
  // Función para mostrar la mano del jugador humano en la "consola"
  function displayHand(hand) {
    let handStr = "Tu mano: " + hand.map((card, index) => `[${index + 1}] ${card.toString()}`).join(" | ");
    log(handStr);
  }
  
  // Función para estimar (de forma sencilla) cuántos turnos se podrían ganar con la mano
  function estimateWins(hand) {
    let score = 0;
    hand.forEach(card => {
      if (card.value === 1)
        score += (["CORAZONES", "DIAMANTES"].includes(card.suit)) ? 1.5 : 1;
      else if (card.value >= 11)
        score += 1;
      else if (card.value === 10)
        score += 0.8;
      else
        score += 0.5;
    });
    return Math.round(score / 1.5);
  }
  
  // VARIABLES GLOBALES DEL JUEGO
  let players = [];
  let deck = [];
  let rounds = [5, 4, 3, 2, 1];
  let currentRoundIndex = 0;
  
  // FUNCIONES DEL FLUJO DEL JUEGO
  
  function startGame() {
    log("Bienvenido a Jerarquía - de Sao Paulo a Albatera");
    setupPlayers();
  }
  
  // Configuración de jugadores: pregunta cantidad y nombres
  function setupPlayers() {
    promptUser("¿Cuántos jugadores en total (incluyéndote)? (2-8): ").then(answer => {
      let num = parseInt(answer);
      if (isNaN(num) || num < 2 || num > 8) {
        log("Número inválido. Inténtalo de nuevo.");
        setupPlayers();
        return;
      }
      promptUser("¿Quieres personalizar los nombres de los jugadores? (s/n): ").then(answer2 => {
        let personalizar = ["s", "si", "sí"].includes(answer2.toLowerCase());
        players = [];
        if (personalizar) {
          promptUser("Introduce tu nombre: ").then(name => {
            if (name.trim() === "") name = "Jugador";
            players.push(new Player(name, true));
            createAIPlayers(num - 1, personalizar, 1).then(() => {
              startRounds();
            });
          });
        } else {
          players.push(new Player("Jugador", true));
          createAIPlayers(num - 1, false, 1).then(() => {
            startRounds();
          });
        }
      });
    });
  }
  function createAIPlayers(count, personalizar, startIndex) {
    return new Promise((resolve) => {
      function createNext(i) {
        if (i >= count) {
          resolve();
          return;
        }
        if (personalizar) {
          promptUser(`Introduce el nombre del jugador ${i + startIndex + 1}: `).then(name => {
            if (name.trim() === "") name = `IA ${i + startIndex}`;
            players.push(new Player(name, false));
            createNext(i + 1);
          });
        } else {
          players.push(new Player(`IA ${i + startIndex}`, false));
          createNext(i + 1);
        }
      }
      createNext(0);
    });
  }
  
  // Comienza una ronda
  function startRounds() {
    if (players.length <= 1) {
      endGame();
      return;
    }
    let cardsPerPlayer = rounds[currentRoundIndex % rounds.length];
    
    // Si es la ronda final (1 carta), mostramos un mensaje explicativo
    if (cardsPerPlayer === 1) {
      log("<hr> ¡RONDA FINAL! Las cartas se colocan en la frente. No puedes ver la tuya, pero podrás ver las cartas de los demás jugadores.<hr>");
    } else {
      log(`<hr> Ronda ${currentRoundIndex + 1}: ${cardsPerPlayer} cartas por jugador <hr>`);
    }
    
    playRound(cardsPerPlayer).then(() => {
      currentRoundIndex++;
      // Se eliminan jugadores sin vidas
      players = players.filter(p => p.lives > 0);
      if (players.length <= 1) {
        endGame();
      } else {
        promptUser("Presiona Enter para la siguiente ronda.").then(() => {
          startRounds();
        });
      }
    });
  }
  
  // Jugar una ronda completa (reparto, apuestas, turnos y actualización de vidas)
  function playRound(cardsPerPlayer) {
    return new Promise(async (resolve) => {
      deck = createDeck();
      // Reparte cartas y reinicia wins
      players.forEach(p => {
        p.hand = [];
        p.wins = 0;
        for (let i = 0; i < cardsPerPlayer; i++) {
          p.hand.push(deck.pop());
        }
      });
    // En la ronda final, la carta se coloca en la frente y se almacena en visibleCards
    let visibleCards = {};
    if (cardsPerPlayer === 1) {
      players.forEach(p => {
        visibleCards[p.name] = p.hand[0];
      });
    }
    // Fase de apuestas: se rota el orden de apuestas según la ronda
    let totalBet = 0;
    let startingBetIndex = currentRoundIndex % players.length;
    let bettingOrder = players.slice(startingBetIndex).concat(players.slice(0, startingBetIndex));
    for (let i = 0; i < bettingOrder.length; i++) {
      let p = bettingOrder[i];
      // Para el último jugador en la orden de apuestas se pasa el total acumulado
      let totalBetSoFar = (i === bettingOrder.length - 1) ? totalBet : null;
      await p.makeBet(5 - cardsPerPlayer + 1, cardsPerPlayer, totalBetSoFar, (cardsPerPlayer === 1 ? visibleCards : null));
      totalBet += p.bet;
    }
    log("Apuestas realizadas:");
    bettingOrder.forEach(p => {
      log(`${p.name}: ${p.bet}`);
    });
      // Fase de juego (turnos)
      // Se inicia el primer turno con el jugador 0
      let startingIndex = 0;
      for (let trick = 0; trick < cardsPerPlayer; trick++) {
        log(`<br>--- Vuelta ${trick + 1} ---`);
        let cardsPlayed = [];
        // Se define el orden a partir del ganador del turno anterior
        let roundOrder = players.slice(startingIndex).concat(players.slice(0, startingIndex));
        for (let i = 0; i < roundOrder.length; i++) {
          let p = roundOrder[i];
          log(`<br>${p.name} tiene el turno.`);
          // En la ronda final, si es el jugador humano se muestran las cartas de los demás
          if (p.isHuman && cardsPerPlayer === 1) {
            let others = "";
            for (let key in visibleCards) {
              if (key !== p.name) {
                others += `${key}: ${visibleCards[key].toString()}<br>`;
              }
            }
            log("Cartas visibles de otros jugadores:<br>" + others);
          }
          let isFirst = (i === 0);
          let isLast = (i === roundOrder.length - 1);
          let cardIndex = await p.chooseCard(cardsPlayed, isFirst, isLast);
          let playedCard = p.hand.splice(cardIndex, 1)[0];
          // Si se juega un As, se decide su valor
          if (playedCard.value === 1) {
            await p.chooseAceValue(playedCard);
          }
          cardsPlayed.push(playedCard);
          log(`${p.name} juega: ${playedCard.toString()}${(playedCard.value === 1 ? " (valor: " + (playedCard.asAlto ? "12" : "1") + ")" : "")}`);
        }
        // Se determina el ganador del turno
        let winningCard = cardsPlayed[0];
        let winningIndex = 0;
        cardsPlayed.forEach((card, index) => {
          if (card.getHierarchyValue() > winningCard.getHierarchyValue()) {
            winningCard = card;
            winningIndex = index;
          }
        });
        let winner = roundOrder[winningIndex];
        winner.wins++;
        log(`<br>${winner.name} gana el turno con ${winningCard.toString()}${(winningCard.value === 1 ? " (valor: " + (winningCard.asAlto ? "12" : "1") + ")" : "")}`);
        startingIndex = players.indexOf(winner); // El próximo turno comienza con el ganador
        // Se muestra el estado de apuestas vs. turnos
        players.forEach(p => {
          log(`${p.name}: ${p.wins}/${p.bet} Victorias`);
        });
        await promptUser("Presiona Enter para continuar al siguiente turno.");
      }
      // Actualizar vidas según la diferencia entre apuesta y turnos ganados
      players.forEach(p => {
        let diff = Math.abs(p.wins - p.bet);
        p.lives -= diff;
        log(`${p.name}: Apostó ${p.bet}, obtuvo ${p.wins}, pierde ${diff} vidas (vidas restantes: ${p.lives}).`);
      });
      log("<hr> Estado del juego:");
      players.forEach(p => {
        log(`${p.name}: ${p.lives} vidas`);
      });
      // Se eliminan los jugadores sin vidas
      let eliminated = players.filter(p => p.lives <= 0);
      eliminated.forEach(p => {
        log(`${p.name} ha sido eliminado!`);
      });
      resolve();
    });
  }
  
  // Función final: muestra el ganador o si nadie ganó
  function endGame() {
    if (players.length === 1) {
      log(`<br>¡${players[0].name} es el GANADOR!`);
    } else {
      log("<br>¡No hay ganador! Todos han sido eliminados.");
    }
    log("Gracias por jugar a Jerarquía!");
  }
  
  // INICIO DEL JUEGO
  window.onload = function () {
    startGame();
  };
  