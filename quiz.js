/* Personality quiz — edit freely. Each answer adds a point to one result (the letter).
   Results: C cat, B bunny, U bear, O owl, G ghost, H heart, F frog. */
window.QUIZ = {
  title: "WHAT KIND OF STRANGER ARE YOU?",
  questions: [
    { q: "You walk into the party. First move?", a: [
      ["find the snacks and a good corner", "C"],
      ["circle the room saying hi to everyone", "B"],
      ["ask the host if they need any help", "U"],
      ["scan for the most interesting person to talk to", "O"] ] },
    { q: "The party is peaking. Where are you?", a: [
      ["dancing on something you shouldn't be", "F"],
      ["deep in a one-on-one conversation", "H"],
      ["already halfway out the door", "G"],
      ["in the kitchen, somehow in charge of the music", "U"] ] },
    { q: "Someone brings out a karaoke mic.", a: [
      ["you volunteer. no song chosen yet.", "F"],
      ["you hype everyone up from the couch", "B"],
      ["you vanish to \"get a drink\"", "G"],
      ["you sing and somehow everyone gets emotional", "H"] ] },
    { q: "A stranger sits down next to you.", a: [
      ["you learn their entire life story", "B"],
      ["you nod and hand them a candy cigarette", "C"],
      ["you ask a question that makes them go \"huh\"", "O"],
      ["you make sure they have a drink and a seat", "U"] ] },
    { q: "Your ideal end to the night?", a: [
      ["a long talk on the stoop", "O"],
      ["everyone singing along to the same song", "H"],
      ["slipping out unnoticed, text \"home safe\" later", "G"],
      ["chaos, one group photo, zero regrets", "F"] ] },
    { q: "Pick a candy cigarette pose.", a: [
      ["leaning on a wall like a movie star", "C"],
      ["huge dramatic exhale", "F"],
      ["holding it like a pen, deep in thought", "O"],
      ["not posing, just passing them out", "U"] ] },
    { q: "Your friends would say you're...", a: [
      ["the quiet one with the best one-liners", "C"],
      ["the one who disappears", "G"],
      ["the one who cries at toasts", "H"],
      ["the one who knows everybody", "B"] ] }
  ],
  // index into the critters drawn on the fortune page: 0 bunny, 1 cat, 2 bear, 3 owl, 4 ghost, 5 heart, 6 frog
  results: {
    B: { critter: 0, name: "THE HOPPER", text: "you bounce between every group and know everyone's name by 9pm. nobody's a stranger for long around you." },
    C: { critter: 1, name: "THE LURKER", text: "you pick the best corner and watch it all. you rarely talk, but when you do, the room goes quiet." },
    U: { critter: 2, name: "THE HUGGER", text: "you're the first to ask if people ate. the whole party quietly runs on you." },
    O: { critter: 3, name: "THE LISTENER", text: "you remember everything and ask the question nobody saw coming. your advice is suspiciously good." },
    G: { critter: 4, name: "THE VANISHER", text: "one minute you're here, the next you're gone. mysterious. a legend. it's fine, we noticed." },
    H: { critter: 5, name: "THE ROMANTIC", text: "you feel everything, loudly. you cry at toasts and you mean every word." },
    F: { critter: 6, name: "THE WILD CARD", text: "you start the dancing and take the first dare. you are why there's a story tomorrow." }
  }
};
