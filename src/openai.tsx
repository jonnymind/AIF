import OpenAIApi from 'openai'
import ChatCompletionRequestMessage from 'openai'
import * as ReactDOMServer from 'react-dom/server';
import {IFDisambiguation, IFObject, IFRoom, Player} from "./IF"

const MODEL = "gpt-4"

type AIMessage = {
    role: string,
    content: string
}

class OpenAIChatbot {
    private openai: OpenAIApi | null
    public DEFAULT_LANGUAGE = "English"
    public DEFAULT_STYLE = "Synthetic"
    public ROOM_SYSTEM_PROMPT:string
    public COMMAND_SYSTEM_PROMPT:string
    public EXAMINE_SYSTEM_PROMPT:string
    public DISAMBIGUATE_SYSTEM_PROMPT:string
    

    constructor(apiKey: string, dry:boolean=false) {
        if(!dry) {
            this.openai = new OpenAIApi({
                apiKey: apiKey,
                dangerouslyAllowBrowser: true 
                });
        }
        else {
            this.openai = null
        }

        this.ROOM_SYSTEM_PROMPT = `
        You are an interactive fiction game. The user will provide you with
        json data about the current room the character is in:
        * Generic description (in the field 'description').
        * Additional attributes of the room, usually a short list of adjectives, in the field 'extra'.
        * Exits, in the fields 'n' for nord, 'e' for east, 's' for south, 'w' for west, 'nw' for
            north-west, 'ne' for north-east, 'sw' for south-west and 'se' for south-east; the value
            will be a short description of where directions lead to.
        * A list of objects contained in the room, each of wich will have the attributes,
            'name', 'description' and 'extra'; in the room description, you will have only to
            include the name and eventually render the 'extra' attributes.
        In the rendering, all the null fields, and all the fields that are not indicated here.
        You can pick and chose which of the elements in 'extra' fields for room and object
        you want to actually render each time.
        `

        this.COMMAND_SYSTEM_PROMPT = `
        You are an interactive fiction game. The user will provide you with
        json data the field 'command' with the input. 
        
        Reply with a json object containing:
        * The 'action' the user wants to perform. It can be:
            * 'move' if the user types a directional command as north, n, southeast, sw etc.
            * 'examine' if the user wants more information about a certain object, the room it's in
              or themselves.
            * 'use' if the user wants to use a specific object.
            * 'take' pick up an object from the room.
            * 'drop' if the user wants to drop an object in the player's inventory.
            * 'unknown' in other cases.
        * The optional 'object' on which the action is applied. 
            - If the action refers to the player themselves, set this field to "player".
            - If the action refers to the room the player is in, set this field to "room".
            - if the action is "move", set this field to the direction the user wants to go 
              (one or two letters, i.e. 'n' for north, 'sw' for south-west etc.)
              - If the action is applied on an object, set this field to the named object.
        * The optional 'target', which is the additional ultimate target acted upon, if any.
        * An optional 'error' field containing a coincise explanation of why the action is misunderstood
        (i.e. a mispelling), or cannot be completed (i.e. the named object is not part of the
            given context). This include actions with ambiguous or non existing objects or targets. 
            `

        this.DISAMBIGUATE_SYSTEM_PROMPT = `
            You are an interactive fiction game, 
            and I need you to disambiguate the object the player is referring to.
            The user data is a json object with one field called "referred" which 
            is the object named to the user, and a structure "player" that contains:
            - an inventory, with the set of objects the player is carriyng,
            - a room with a field called 'objects' that contains the list of 
              objects that are in the room.
            
            Every object has a field 'name' and possibly a list of 'extra', 
            containing additional information about that object. 
            
            I want you to return a json object with a single 'object' field;
            if you can disambiguate the input, its value must be the exact 'name' 
            field of the object the user refers to; otherwise, return an empty json object.
        `

        this.EXAMINE_SYSTEM_PROMPT = `
            You are an interactive fiction game. The user will provide a JSON object describing
            a game object they want to examine. You will render a description of the object using
            the field 'description' and, eventually, all the avaialbe information contained in the
            'extra' (which give multiple additional charateristics of the object).

            An additional field 'type' in request determines if the object being examined is
            a game object, the a room (in which the player is presumabily in) or the player itself.
            The rendering should take account of this context.
        `
    }

    public async sendMessagesToAPI(messages: AIMessage[]): Promise<string| JSX.Element> {
        if(this.openai === null) {
            return new Promise((resolve)=>{
                setTimeout(() =>
                    resolve(<>
                    <hr/>
                    <b>Dry Message:</b><br/>
                    {messages.map((entry) =>{
                        return <><b>{entry.role}</b>:&nbsp;{entry.content}<br/></>
                    })}
                    <hr/>
                    </>)
                , 500)
            })
            
        }

        const response = this.openai.chat.completions.create({
            model: MODEL, // Use the model suited for chat; adjust as needed
            messages: messages as any, // Pass the array of message objects directly
        });
    
        // Process and return the response

        return response
            .then(resp => resp.choices[0]?.message?.content ?? "")
            .catch( error => {
                console.error('Error sending message to OpenAI API:', error);
                throw error
            })
    }

    public async sendMessage(system: string="", user: string=""): Promise<string | JSX.Element> {
        if(!user) {
            throw "sendMessage called without a user entry"
        }

        const msgs: Array<AIMessage> = []
        if(system) {
            msgs.push({role: 'system', content: system})
        }
        if(user) {
            msgs.push({role: 'user', content: user})
        }
        return this.sendMessagesToAPI(msgs)
    }
     
    public async renderRoom(data: IFRoom, style:string = this.DEFAULT_STYLE, language:string = this.DEFAULT_LANGUAGE) {
        const sysStr = this.ROOM_SYSTEM_PROMPT + `
            Please, render the description in ${language}, using a ${style} style.
        `
        return this.sendMessage(sysStr, JSON.stringify(data))
    }
    
    public async parseCommand(command: string, style:string = this.DEFAULT_STYLE, language:string = this.DEFAULT_LANGUAGE) {
        const sysStr = this.COMMAND_SYSTEM_PROMPT + `
            In case of unrecognized command, render the error message ${language}, using a ${style} style.
        `

        return this.sendMessage(
            sysStr, 
            JSON.stringify({command: command}))
    }

    public async examine(obj: IFObject| IFRoom | Player, style:string = this.DEFAULT_STYLE, language:string = this.DEFAULT_LANGUAGE ) {
        const sysStr = this.EXAMINE_SYSTEM_PROMPT + `
            Please, render the description in ${language}, using a ${style} style.
        `
        let type = "player"
        if(obj instanceof IFObject) {
            type = "object"
        } else if(obj instanceof IFRoom) {
            type = "room"
        }
        return this.sendMessage(
            sysStr, 
            JSON.stringify({'object': obj, type: type}))
    }

    public async disambiguate(obj: string, player: Player ): Promise<IFDisambiguation> {
        return this.sendMessage(
            this.DISAMBIGUATE_SYSTEM_PROMPT, 
            JSON.stringify({referred: obj, player: player})).then(r => JSON.parse(r as string))
    }
}

export {OpenAIChatbot}
