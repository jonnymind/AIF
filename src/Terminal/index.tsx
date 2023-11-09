import './terminal.css';
import {ForwardedRef, forwardRef, useCallback, useEffect, useRef, useState} from "react";
import {TerminalHistory, TerminalHistoryItem} from "./types";

export type TerminalProps = {
    history: TerminalHistory;
    promptLabel?: TerminalHistoryItem;
    commandCallback: (s: string) => void
};

export const ROLLER:string = "#####rollo######"

export const Terminal = forwardRef(
    (props: TerminalProps, ref: ForwardedRef<HTMLDivElement>) => {
    const {
    history: history = [],
    promptLabel = '>',
    commandCallback = (s: string) => {}
    } = props;

    
     /**
     * Focus on the input whenever we render the terminal or click in the terminal
     */
     const inputRef = useRef<HTMLInputElement>();
     const [input, setInputValue] = useState<string>('');

     useEffect(() => {
       inputRef.current?.focus();
     });
 
     const focusInput = useCallback(() => {
       inputRef.current?.focus();
     }, []);

     /**
     * When user presses enter, we execute the command
     */
    const handleInputKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          const commandToExecute = input.toLowerCase();
          if (commandToExecute) {
            commandCallback(commandToExecute)
          }
          setInputValue('')
        }
      },
      [input, setInputValue]
    );

    const handleInput = useCallback(
      (e: any) => {
        setInputValue(e.currentTarget.value)
      }
    , [setInputValue])
 
  return (
    <div className="terminal" ref={ref} onClick={focusInput}>
        {history.map((line, index) =>{
          if(line == ROLLER) {
            line = <><img src="roller.gif" style={{width:16, height:16}}></img></>
          }
          return (
        <div className="terminal__line" key={`terminal-line-${index}-${line}`}>
            {line}
        </div>)
        })}
      <div className="terminal__prompt">
        <div className="terminal__prompt__label">{promptLabel}</div>
        <div className="terminal__prompt__input">
        <input
            type="text"
            onKeyDown={handleInputKeyDown}
            onInput={handleInput}
            value={input}
            // @ts-ignore
            ref={inputRef}
          />
        </div>
      </div>
    </div>
  );
});
