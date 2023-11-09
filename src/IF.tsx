import { OpenAIChatbot } from "./openai"

export interface IFDisambiguation {
    object?: string
}

export class IFObject {
    'name': string
    'description': string
    'extra'?: string[]
    'state'?: any
}

export class IFRoom {
    'name': string
    'description': string
    'extra'?: string[]
    'n'?: string
    'e'?: string
    'w'?: string
    's'?: string
    'ne'?: string
    'nw'?: string
    'se'?: string
    'sw'?: string
    'objects'?: IFObject[]
    'state'?: any
}

export class Player {
    'room': IFRoom
    'description': string
    'inventory': IFObject[]
    'extra'?: string[]
    'state'?: any
}

export interface ParsedCommand {
    action: string
    object?: string
    target?: string
    error?: string
}

export const ObjectDB: Map<string, IFObject> = new Map()
export const RoomDB: Map<string, IFRoom> = new Map()

export function addObject(obj: IFObject): IFObject {
    ObjectDB.set(obj.name.toLowerCase(), obj)
    return obj
}

export function addRoom(room: IFRoom): IFRoom {
    RoomDB.set(room.name.toLowerCase(), room)
    return room
}

export const Nowhere: IFRoom = {
    name: "nowhere",
    description: "nowhere"
}

export const player: Player = {
    room: Nowhere,
    description: "It's you",
    inventory: []
}


async function resolveEntity(entity: string, chatbot: OpenAIChatbot) {
    let object = null
    let error = null
    console.log(`Disambiguating "${entity}"`)
    if(entity === "room") {
        object = player.room
    } else if( entity === "player") {
        object = player
    } else {
        const found_object = await chatbot.disambiguate(entity, player)
        console.log(`chatbot returned ${JSON.stringify(found_object)}`)
        if(found_object.object) {
            object = ObjectDB.get(found_object.object.toLowerCase())
            if(!object) {
                error = `ERROR: Can't find any object named ${found_object.object}`
            }
            console.log(`Disambiguated "${entity}" as ${JSON.stringify(object)}`)
        } else {
            error = `What do you mean with ${entity}?`
            console.log(`Can't disambiguate "${entity}" (${JSON.stringify(found_object)}): ${error}`)
        }
        
    }

    return {entity: object, error: error}
}

async function resolveEntities(cmd: ParsedCommand, chatbot: OpenAIChatbot) {
    let finalError = null
    let target = null
    let object = null
    if(cmd.action != "move") {
        if(cmd.object) {
            let {entity, error} = await resolveEntity(cmd.object, chatbot)
            object = entity
            finalError = error
        }
        if(! finalError && cmd.target ) {
            let {entity, error} = await resolveEntity(cmd.target, chatbot)
            target = entity
            finalError = error
        }
    }
   
    return {obj: object, tgt: target, error: finalError}
}

export async function gameLogic(cmd: ParsedCommand, chatbot: OpenAIChatbot): Promise<string | JSX.Element> {
    let message = ""
    const {obj, tgt, error} = await resolveEntities(cmd, chatbot)
    if(error) {
        return error
    }

    if (cmd.action === "examine" && obj) {
        return chatbot.examine(obj)
    } else if (cmd.action === "take" && obj) {
        const fobj = (obj as IFObject)
        if (! player.room.objects?.includes(fobj)) {
            message = `Can't see any ${fobj.name} around.`
        } else {
            player.room.objects = player.room.objects.filter( (roomobj) => roomobj != fobj )
            player.inventory.push(fobj)
            message = "Taken."
        }
    } else if(cmd.action === "drop" && obj) {
        const fobj = (obj as IFObject)
        if (! player.inventory?.includes(fobj)) {
            message = `You don't have ${fobj.name}.`
        } else {
            player.inventory = player.inventory.filter( (iobj) => iobj != fobj )
            if(!player.room.objects) player.room.objects = []
            player.room.objects.push(fobj)
            message = "Dropped."
        }
    } else if (cmd.action === "move" && cmd.object) { 
        const targetRoom = player.room[cmd.object as keyof IFRoom]
        if(! targetRoom) {
            message = `You can't go ${cmd.object} from here`
        } else {
            const destination = RoomDB.get(targetRoom.toLowerCase())
            if(!destination) {
                message = `ERROR: can't find room named ${targetRoom}`
            } else {
                player.room = destination
            }
        }
    } else if(cmd.action === 'unknown' && cmd.error) {
        message = cmd.error
    } else {
        message = `Sorry, I don't get what you mean.`
    }

    return message
}
