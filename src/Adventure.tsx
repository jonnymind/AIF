import { IFObject, IFRoom, player, addObject, addRoom } from "./IF";

const RustySword: IFObject = addObject({
    name: "Rusty Sword",
    description: "An ancient looking sword",
    extra: ["seen better days", "unsharpened"]
})

const Ring: IFObject = addObject({
    name: "Golden Ring",
    description: "an ornate ring",
    extra: ["made of pure gold", "precious", "encrusted with diamonds"]
})

const Entrance: IFRoom = addRoom({
    name: "The Entrance",
    description: "the outside of a large construction, in front of a stone gate",
    extra: ["wild", "immerse in the forest", "ancient"],
    e: "Atrium",
    objects: [RustySword]
})

addRoom({
    name: "Atrium",
    description: "an atrium of a large temple",
    extra: ["dilapidated", "broken", "ancient"],
    w: "The Entrance",
    objects: [Ring]
})

function startGame() {
    player.room = Entrance
    player.description = "an adventurer of of the likes of Lara Croft or Indiana Jones"
}

export {startGame}
