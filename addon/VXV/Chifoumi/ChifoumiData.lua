local ns = select(2, ...).Chifoumi

--- The Chi Fou Mi as the website exports them (contract VXV-CHIFOUMIS-3, packages/server/src/domain/addonGames.ts),
--- brought by the player's companion or passed on by an officer's addon: what each member owes and the limit that
--- bars them, those without the role « Membre » on Discord, the players' portraits, the games not paid yet and the
--- latest games (the lines of every game of Le Dé Pipé, VXV.DiceGames).
local ChifoumiData = VXV.SiteData({
    name = "chifoumi",
    header = "VXV-CHIFOUMIS-3",
    New = VXV.DiceGames.New,
    lines = VXV.DiceGames.LINES,
})
ns.ChifoumiData = ChifoumiData

--- The file of the character's member's portrait, or nil without the website's data or a portrait.
function ChifoumiData.PortraitOf(name)
    return VXV.DiceGames.Portrait(ChifoumiData.Current(), name)
end
