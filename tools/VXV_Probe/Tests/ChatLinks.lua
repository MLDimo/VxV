local _, ns = ...

--- T14 (10 November): the « [Regarder] » link of a game's announcement in the guild chat (owner's report: it does not
--- show). Measures each step: what the guild chat's events carry, whether a message filter runs and what it returns,
--- whether the chat frame shows an addon link (|Haddon:…|h), and what a click on it calls (SetItemRef, the
--- EventRegistry's "SetItemRef" callback).
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("chatlien")

local MARK = "vxvtest"
local LINK = "|cffff5ac8|Haddon:vxvprobe:test|h[Regarder]|h|r"

local filtering = false

local function printable(text)
    return (tostring(text):gsub("|", "||"))
end

--- The guild chat's filter: logs each message, and adds the link to those holding the mark.
local function filter(_, event, message, author, ...)
    if Util.IsSecret(message) then
        log.Info(event, "message secret")
        return false
    end
    local marked = type(message) == "string" and message:find(MARK, 1, true) ~= nil
    log.Info(event, "filtre appelé :", printable(message), "de", Util.Safe(author), marked and "(marqué)" or "")
    if marked then
        return false, message .. " " .. LINK, author, ...
    end
    return false
end

local function startFilter()
    if filtering then
        log.Info("filtre déjà posé")
        return
    end
    filtering = true
    log.Call("AddMessageEventFilter(CHAT_MSG_GUILD)", Compat.AddMessageEventFilter("CHAT_MSG_GUILD", filter))
    log.Info("écris « " .. MARK .. " » dans le chat de guilde : le lien [Regarder] doit s'ajouter au message")
end

--- Writes a line with the addon link in the chat frame, for the player to click.
local function showLocal()
    DEFAULT_CHAT_FRAME:AddMessage("VXV Probe, lien d'addon : " .. LINK)
    log.Info("ligne écrite dans le chat avec le lien :", printable(LINK))
end

ns.Registry.Register({
    id = "chatlien",
    description = "lien [Regarder] dans le chat de guilde : filtre, affichage, clic (T14)",
    Setup = function()
        log.Listen("CHAT_MSG_GUILD", function(message, author)
            log.Trace("CHAT_MSG_GUILD reçu :", printable(message), "de", Util.Safe(author))
        end)
        hooksecurefunc("SetItemRef", function(link, text, button)
            log.Ok("SetItemRef appelé :", printable(link), "texte", printable(text), "bouton", Util.Safe(button))
        end)
        local registry = Compat.Resolve("EventRegistry")
        if type(registry) == "table" and type(registry.RegisterCallback) == "function" then
            local ok, problem = pcall(registry.RegisterCallback, registry, "SetItemRef", function(_, link)
                log.Ok("EventRegistry SetItemRef :", printable(link))
            end, {})
            log.Call("EventRegistry:RegisterCallback(SetItemRef)", ok, problem)
        else
            log.Info("EventRegistry absent")
        end
    end,
    commands = {
        { name = "filtre", run = startFilter },
        { name = "local", run = showLocal },
    },
})
