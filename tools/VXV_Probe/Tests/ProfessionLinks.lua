local _, ns = ...

--- T13 (9 November): a member's profession seen as the game shows a linked one (owner's request). Measures whether
--- the client gives the link of the profession whose window is open, how long it is (the guild's messages hold 255
--- bytes), and whether the game opens it again later, from another character while its owner is offline: by the
--- function a click on a chat link calls (SetItemRef), and by a click on the link written in the chat frame.
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("lien")

local READ_DELAY_SECONDS = 1
-- The longest text an addon message carries (measured on 3 October).
local MESSAGE_BYTES = 255

local db = {}

--- The link's inner part ("trade:…"), which SetItemRef takes, from the whole hyperlink.
local function inner(link)
    return link:match("|H(.-)|h")
end

--- A link readable in the journal: the escape characters shown, not interpreted.
local function printable(link)
    return (link:gsub("|", "||"))
end

--- Whether the open window is a linked profession, and whose, as the client tells it.
local function logLinked(when)
    local ok, linked, player = Compat.IsTradeSkillLinked()
    log.Call(when .. " : IsTradeSkillLinked", ok, not ok and linked or nil)
    if ok then
        log.Info(when, ": fenêtre liée", tostring(linked), "à", Util.Safe(player))
    end
    local okBase, base = Compat.GetBaseProfessionInfo()
    if okBase and type(base) == "table" then
        log.Info(when, ": métier", Util.Safe(base.professionName), base.professionID, "niveau", base.skillLevel)
    end
    local okIds, ids = Compat.GetAllRecipeIDs()
    local learned = 0
    for _, id in ipairs(okIds and type(ids) == "table" and ids or {}) do
        local okInfo, info = Compat.GetRecipeInfo(id)
        if okInfo and type(info) == "table" and info.learned then
            learned = learned + 1
        end
    end
    log.Info(when, ":", learned, "recette(s) apprise(s) affichée(s)")
end

--- Reads the link of the profession whose window is open, and keeps it with its owner (one per character and name).
local function readLink()
    logLinked("fenêtre ouverte")
    local ok, link = Compat.GetTradeSkillListLink()
    log.Call("GetTradeSkillListLink", ok, not ok and link or nil)
    if not ok or type(link) ~= "string" or Util.IsSecret(link) then
        log.Fail("pas de lien pour cette fenêtre :", Util.Safe(link))
        return
    end
    log.Check(#link <= MESSAGE_BYTES, "lien de", #link, "octets (un message entre addons en porte", MESSAGE_BYTES,
        ")")
    log.Info("lien :", printable(link))
    local okBase, base = Compat.GetBaseProfessionInfo()
    local profession = okBase and type(base) == "table" and Util.Safe(base.professionName) or "?"
    local owner = Util.Safe(GetUnitName("player", true))
    local key = owner .. " · " .. profession
    if not db.links[key] then
        db.order[#db.order + 1] = key
    end
    db.links[key] = link
    log.Ok("lien gardé :", key, "(", #db.order, "lien(s) en tout)")
end

local function list()
    if #db.order == 0 then
        log.Info("aucun lien gardé : ouvre la fenêtre d'un de tes métiers")
    end
    for index, key in ipairs(db.order) do
        log.Info(index, key, #db.links[key], "octets")
    end
end

local function chosen(args)
    local index = tonumber((Util.SplitFirst(args or ""))) or #db.order
    local key = db.order[index]
    if key == nil then
        log.Fail("aucun lien n°", index, ": /vxvtest lien liste")
    end
    return key, key and db.links[key]
end

--- Opens a kept link as a click on it in the chat would.
local function open(args)
    local key, link = chosen(args)
    if link == nil then
        return
    end
    log.Info("ouverture de", key, "par SetItemRef")
    log.Call("SetItemRef", Compat.SetItemRef(inner(link), link, "LeftButton"))
    C_Timer.After(READ_DELAY_SECONDS, function()
        logLinked("après SetItemRef")
    end)
end

--- Writes a kept link in the chat frame, for the player to click.
local function chat(args)
    local key, link = chosen(args)
    if link ~= nil then
        DEFAULT_CHAT_FRAME:AddMessage("VXV Probe, clique : " .. link .. " (" .. key .. ")")
        log.Info("lien écrit dans le chat :", key)
    end
end

ns.Registry.Register({
    id = "lien",
    description = "lien d'un métier : le lire à l'ouverture de sa fenêtre, le rouvrir plus tard (T13)",
    Setup = function(saved)
        saved.professionLinks = saved.professionLinks or { links = {}, order = {} }
        db = saved.professionLinks
        log.Listen("TRADE_SKILL_SHOW", function()
            C_Timer.After(READ_DELAY_SECONDS, function()
                local ok, linked = Compat.IsTradeSkillLinked()
                if not (ok and linked) then
                    readLink()
                end
            end)
        end)
    end,
    commands = {
        { name = "lire", run = readLink },
        { name = "liste", run = list },
        { name = "ouvrir", usage = "[n]", run = open },
        { name = "chat", usage = "[n]", run = chat },
    },
})
