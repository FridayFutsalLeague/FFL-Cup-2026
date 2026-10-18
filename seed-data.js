export const SEED = {
  title: "FFL Cup 2026",
  groups: {
    A: ["Wolves", "Bears", "Eagles"],
    B: ["Cobras", "Lions", "Dragons"]
  },
  teams: {
    Wolves: ["Simon", "Anthony T", "Tony", "Rob", "Martin", "Cabe"],
    Dragons: ["Raksa", "Netra", "Richard", "Anthony", "Long", "Bax"],
    Bears: ["Chris", "Bach", "Vu", "Alan", "Nathan", "Jarvis"],
    Lions: ["Sape", "Tion", "Hai", "Jason", "Rahul", "Virack"],
    Cobras: ["Wes", "Justin", "Evan", "Tai", "Dipper", "Cesar"],
    Eagles: ["Simon Tran", "David", "Nhan", "Dali", "Pete", "Leo"]
  },
  matches: [
    {id:"g1",stage:"group",group:"A",time:"11:00",court:1,home:"Wolves",away:"Bears"},
    {id:"g2",stage:"group",group:"B",time:"11:00",court:2,home:"Cobras",away:"Lions"},
    {id:"g3",stage:"group",group:"A",time:"11:30",court:1,home:"Eagles",away:"Wolves"},
    {id:"g4",stage:"group",group:"B",time:"11:30",court:2,home:"Dragons",away:"Cobras"},
    {id:"g5",stage:"group",group:"A",time:"12:00",court:1,home:"Bears",away:"Eagles"},
    {id:"g6",stage:"group",group:"B",time:"12:00",court:2,home:"Lions",away:"Dragons"},
    {id:"g7",stage:"group",group:"A",time:"12:30",court:1,home:"Wolves",away:"Bears"},
    {id:"g8",stage:"group",group:"B",time:"12:30",court:2,home:"Cobras",away:"Lions"},
    {id:"g9",stage:"group",group:"A",time:"13:00",court:1,home:"Eagles",away:"Wolves"},
    {id:"g10",stage:"group",group:"B",time:"13:00",court:2,home:"Dragons",away:"Cobras"},
    {id:"g11",stage:"group",group:"A",time:"13:30",court:1,home:"Bears",away:"Eagles"},
    {id:"g12",stage:"group",group:"B",time:"13:30",court:2,home:"Lions",away:"Dragons"},
    {id:"sf1",stage:"semi",time:"14:30",court:1,home:"A1",away:"B2"},
    {id:"sf2",stage:"semi",time:"14:30",court:2,home:"B1",away:"A2"},
    {id:"final",stage:"final",time:"15:30",court:1,home:"SF1 Winner",away:"SF2 Winner"}
  ]
};
