import React, {useEffect} from 'react';
import logo from './logo.svg';
import './App.css';
import { Terminal, ROLLER } from './Terminal';
import {useTerminal} from "./Terminal/hooks";
import { OpenAIChatbot } from './openai';
import { startGame } from './Adventure';
import { IFRoom, ParsedCommand, gameLogic, player } from './IF';

function App() {
  const welcomeDoneRef = React.useRef(false)
  const {
    history,
    pushToHistory,
    setTerminalRef,
    resetTerminal,
  } = useTerminal();

  const dryRun = process.env.REACT_APP_NODE_ENV !== 'test' && process.env.REACT_APP_NODE_ENV !== 'prod'
  const chatbot = new OpenAIChatbot(process.env.REACT_APP_OPENAI_API_KEY ?? "", dryRun)
  const currentRoom = React.useRef<IFRoom>()
  currentRoom.current = player.room
  const showRoom = (room: IFRoom) => {
    pushToHistory(<><b>{player.room.name}</b><br/></>)
    pushToHistory(ROLLER)
    chatbot.renderRoom(player.room).then(response => pushToHistory(response))
  }

  // Called at startup.
  useEffect(() => {
    // Neutralizing strict mode for this call.
    if(welcomeDoneRef.current) {
      return
    }
    welcomeDoneRef.current = true

    startGame()
    resetTerminal()
    pushToHistory(
        <div><strong>Welcome!</strong> To the AI Interactive Fiction.</div>
    );
    pushToHistory(ROLLER)
    chatbot.sendMessage(
      `You are the narrating voice in an interactive fiction game. 
      In this interaction, you will talk like a tutorial`,
      `Please describe a common interactive fiction game in less than 50 words.`
    ).then(response => {
      pushToHistory(response)
      pushToHistory(<><hr/></>)
      showRoom(player.room)
    })
    }, []);

  // process each command
  const processCommand = (cmd: string) => {  
    pushToHistory(`Your command: ${cmd}`)
    pushToHistory(ROLLER)

    // process command:
    chatbot.parseCommand(cmd).then( result => {
      console.log(result)
      gameLogic(JSON.parse(result as string) as ParsedCommand, chatbot).then( result => {
        pushToHistory(result)
      
        if(currentRoom.current !== player.room) {
          pushToHistory(ROLLER)
          showRoom(player.room)
          currentRoom.current = player.room
        }
      })
      
    })    
  }

  return (
    <div className="App">
      <Terminal 
        promptLabel="Your orders?> " 
        history={history}
        commandCallback={processCommand}/>
    </div>
  );
}

export default App;
