# AI-driven Interactive Fiction

This is a small project demonstrating how you can use ChatGPT API and prompt
programming to create code in run-time to drive a live application.

AI prompting is mostly used for chatbots, but using careful prompt programming,
it can be employed do drive interactive applications. Giving ChatGPT the 
context as a structured dataset (i.e. in JSON), it is able to disambiguate
and identify entities that were ambiguously identified by the user, and provide
your program with structured data.

## How does it work

The developer needs to provide only basic definitions of the objects in the game, and
use prompt-programming to have them rendered into a coherent description and 
parse complex requests from the user.

### Generating room descriptions.

This is how a room is described in the game data:

```
const RustySword: IFObject = addObject({
    name: "Rusty Sword",
    description: "An ancient looking sword",
    extra: ["seen better days", "unsharpened"]
})

const Entrance: IFRoom = addRoom({
    name: "The Entrance",
    description: "the outside of a large construction, in front of a stone gate",
    extra: ["wild", "immerse in the forest", "ancient"],
    e: "Atrium",
    objects: [RustySword]
})
```

The prompt to make this come to life is:

```
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
```

And the result looks like:

> You are standing outside a large, wild construction immersed in the forest. The edifice, worn by
> the ticking of the ages, rests before you. Its imposing stone gate stands robust, tallying its 
> grandeur. This is the mythical entrance, challenging and intriguing.
> 
> To the east, a short journey will lead you to the Atrium.
> Your gaze moves to the ground and you spot something unusual. A Rusty Sword lies abandoned. It
> is an ancient looking sword, unsharpened and clearly having seen better days. Could it be of any
> use? Well, that is for you to discern.

## Parsing commands

You can leverage the power of ChatGPT to break down user commands into more structured requests
that chan drive the logic of your program.

This prompt categorizes the actions that the user wants to perform and recognizes the objects on
which they are performed, returning a structured object that you can analyse programmatically:

```
You are an interactive fiction game. The user will provide you with
a json object, with the input stored in the field 'command'. 

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
```

The elegance of this method is that it allows to break down the user actions in categories and
provides us with a coherent message we can turn to the user directly when the category is not
recognized. For example:

> Your command 'blurb the fuzz and get on with it now!' is not recognized. Please try to use
> different verbs or check your spelling.

## Disambiguate objects

Once the command is broken down, we can try and associate the objects the user was referencing
to what we know about the world.

We can leverage the power of ChatGPT to identify even vaguely described objects. 
So, let's say that the user enters the command:

> tell me more about that sparkly thing

Now, the player happens to have in its inventory this object:

```
const Ring: IFObject = addObject({
    name: "Golden Ring",
    description: "an ornate ring",
    extra: ["made of pure gold", "precious", "encrusted with diamonds"]
})
```

We could infer that, being made of gold and encrusted with diamonds, this may be
the sparkly thing the player is referring to. We can program the prompt to
return exactly this object:

```
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
```

The trace of the operations fired when we parse this command is:

```
[Log] { (bundle.js, line 193)
  "action": "examine",
  "object": "sparkly thing"
}
[Log] Disambiguating "sparkly thing" (bundle.js, line 341)
[Log] chatbot returned {"object":"Golden Ring"} (bundle.js, line 348)
[Log] Disambiguated "sparkly thing" as {"name":"Golden Ring","description":"an ornate ring","extra":["made of pure gold","precious","encrusted with diamonds"]} (bundle.js, line 354)
```

On the first line we can see that ChatGPT was able to break down the sentence and correctly
categorize the request as an "examine". Then, providing ChatGPT with the player object, that
has the golden ring in their inventory field, we get the correct object identifier. We can then
serach for the game database and retrieve the correct object, and pass it to the text geneartor:

> The player is currently in possession of a Golden Ring which is visually compelling. At first
> glance, it takes the form of an ornate ring, exquisitely fashioned and unerringly eye-catching.
> Further examination of this artifact reveals that it has been sculpted from pure gold, denoting
> its intrinsic value. The ring is identified to be precious, an aspect that intensifies its
> overall allure. Adding to its splendid aesthetic are diamonds tucked into its body, their
> brilliant shimmer contributing to the ring's overall majestic demeanor. The Golden Ring appears
> to hold immense worth, both in value and beauty.

Also, this prompt has the ability to find missing object; the sequence
after the command

> eat the apple

is as follows:

```
[Log] { (bundle.js, line 193)
  "action": "use",
  "object": "apple"
}
[Log] Disambiguating "apple" (bundle.js, line 341)
[Log] chatbot returned {} (bundle.js, line 348)
[Log] Can't disambiguate "apple" ({}): What do you mean with apple? (bundle.js, line 357)
```

## Putting it all together

Here follows an example transcript of the game:

```
Welcome! To the AI Interactive Fiction.
"An interactive fiction game is a text-based adventure where players explore and manipulate the game world by issuing commands, unraveling narratives, solving intricate puzzles, and making choices that influence outcomes, transforming their experiences into personal and immersive digital storytelling journeys."

The Entrance
You are standing outside a large, wild construction immersed in the forest. The edifice, worn by the ticking of the ages, rests before you. Its imposing stone gate stands robust, tallying its grandeur. This is the mythical entrance, challenging and intriguing.

To the east, a short journey will lead you to the Atrium.

Your gaze moves to the ground and you spot something unusual. A Rusty Sword lies abandoned. It is an ancient looking sword, unsharpened and clearly having seen better days. Could it be of any use? Well, that is for you to discern.
Your command: e

Atrium
You find yourself in an atrium of a large temple, emanating an aura of ancient times. Crumbled structures lie around giving away its broken, dilapidated state. 

There is a slight glimmer that catches your eye amongst the ruins; it's a Golden Ring, ornate in its design. Upon a closer look, you can see it's made of pure gold, precious and encrusted with diamonds.

To the west lies the Entrance.
Your command: examine the ring
Your character now holds a golden ring in their hand. This is no ordinary piece of jewellery; it's an ornate ring made of pure gold. Its beauty is simply overwhelming. A soft glow emanates from it, demonstrating its preciousness. Look closely and you'll be able to see the tiny diamonds encrusted into the branding, glittering and casting tiny rainbows of light in response to every little movement. It's a truly precious item to behold.
Your command: take the ring
Taken.

Your command: look at me
You are an adventurer reminiscent of renowned figures such as Lara Croft or Indiana Jones. In your possession, you hold a single item of considerable value: an ornate ring. Unlike any ordinary trinket, this exquisite piece is made of pure gold, precious and encrusted with diamonds, reflecting your fearless exploits and relentless dedication to treasure hunting. 

You find yourself in the atrium of a large temple. The space around you whispers ancient stories, its dilapidated and broken down state testifying to its venerable age. The passage to the west leads to the entrance of the area, beckoning you to continue your adventure. However, the room is currently bereft of other interactable objects. As always, vigilance and a sharp eye for detail will be your trusted allies as you navigate through this fascinating, yet challenging environment.
Your orders?>

```

It is to be noticed how ChatGPT was able to capture the relationships between objects, and
generate descriptions for the room contents and, especially, for the items that the user
is carrying in their inventory (also noticing it was a 'single item'), without explicit prompting.

## How to run

The usual command `npm start` will start the game in "dry mode": dummy data will be used, and 
instead of calling the OpenAI API, when possible, the data that would be sent will be 
returned instead.

To actually run the game, you need an OpenAPI applicaiton token, that can be obtained 
[from OpenAI official site](https://platform.openai.com/api-keys), save it
in a file called "secret" and then run `./test.sh` (or just check out the
environment variables it sets before running `npm start`).

## Credits

I wanted to use React in this project because I was interested in the typescript embedding
of the OpenAI API, and because I thought I might have a use for a sophisticated UI down the
line, other than publishing a runtime of this project on my site.

In order to have an endless scrolling text, I used a modified version of the 
[React Terminal Component written by Alexandru Tasica](https://hackernoon.com/creating-a-terminal-emulator-in-react)
to have a React-enabled scrolling window.