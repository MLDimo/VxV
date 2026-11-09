local ns = select(2, ...).Deathroll

--- The deathrolls as the website exports them (contract VXV-DEATHROLLS-3, packages/server/src/domain/addonGames.ts),
--- brought by the player's companion or passed on by an officer's addon: what each member owes and the limit that
--- bars them, those without the role « Membre » on Discord, the players' portraits, the games not paid yet and the
--- latest games (the lines of every game of Le Dé Pipé, VXV.DiceGames).
local DeathrollData = VXV.SiteData({
    name = "deathroll",
    header = "VXV-DEATHROLLS-3",
    New = VXV.DiceGames.New,
    lines = VXV.DiceGames.LINES,
})
ns.DeathrollData = DeathrollData
