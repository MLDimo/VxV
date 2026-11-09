local ns = select(2, ...).Artisans

--- A crafter's profession seen as the game shows it when they link it in the chat (owner's request of 9 November): a
--- click on them opens the game's own window of their profession, with its recipes. The game opens it only while
--- they are online (probe, T13): the link comes with their recipes, read when they open their profession's window.
local Links = {}
ns.Links = Links

local NO_LINK = "Le métier de %s s'ouvrira quand %s aura ouvert sa fenêtre de %s avec la dernière version de VXV."
local OFFLINE = "%s n'est pas connecté : le jeu n'ouvre son métier que s'il l'est."

--- Whether the guild's list says the character is connected now.
local function online(name)
    for _, member in ipairs(VXV.GuildMembers()) do
        if member.name == name then
            return member.online
        end
    end
    return false
end

--- Whether a click opens the crafter's profession now: its link known, the crafter online.
function Links.Opens(entry)
    return entry.link ~= nil and online(entry.character)
end

--- Opens the crafter's profession, as a click on its link in the chat would; else says why not.
function Links.Open(entry)
    if entry.link == nil then
        VXV.Print(NO_LINK:format(entry.character, entry.character, entry.name))
    elseif not online(entry.character) then
        VXV.Print(OFFLINE:format(entry.character))
    else
        VXV.Compat.SetItemRef(entry.link:match("|H(.-)|h"), entry.link, "LeftButton")
    end
end
