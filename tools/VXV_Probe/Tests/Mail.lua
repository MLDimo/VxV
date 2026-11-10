local _, ns = ...

--- T15 (10 November): a debt paid by mail (owner's request: the gold of a lost game sent by mail settles the debt by
--- itself). Measures what the addon reads of the mailbox: its events, each mail's sender (and the form of its name),
--- subject, gold attached and state, and when the gold is taken.
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("courrier")

local COPPER_PER_GOLD = 10000
local EVENTS = { "MAIL_SHOW", "MAIL_INBOX_UPDATE", "MAIL_CLOSED", "PLAYER_MONEY" }

--- Every mail of the inbox, as the client tells it.
local function readInbox()
    local okCount, count, total = Compat.GetInboxNumItems()
    log.Call("GetInboxNumItems", okCount, not okCount and count or nil)
    if not okCount then
        return
    end
    log.Info("boîte :", Util.Safe(count), "courrier(s) affiché(s) sur", Util.Safe(total))
    for index = 1, tonumber(count) or 0 do
        local ok, _, _, sender, subject, money, cod, daysLeft, items, wasRead, wasReturned =
            Compat.GetInboxHeaderInfo(index)
        if ok then
            log.Info("courrier", index, ": de", Util.Safe(sender), "· objet", Util.Safe(subject), "· or",
                Util.Safe(money), "pc (", (tonumber(money) or 0) / COPPER_PER_GOLD, "po ) · contre-remboursement",
                Util.Safe(cod), "· jours", Util.Safe(daysLeft), "· objets", Util.Safe(items), "· lu",
                Util.Safe(wasRead), "· renvoyé", Util.Safe(wasReturned))
        else
            log.Fail("GetInboxHeaderInfo(" .. index .. ") :", Util.Safe(sender))
        end
    end
end

ns.Registry.Register({
    id = "courrier",
    description = "courrier : expéditeur, or joint, événements de la boîte aux lettres (T15)",
    Setup = function()
        for _, event in ipairs(EVENTS) do
            log.Listen(event, function(...)
                log.Info(event, Util.Join(...))
                if event == "MAIL_SHOW" or event == "MAIL_INBOX_UPDATE" then
                    readInbox()
                end
            end)
        end
        for _, name in ipairs({ "TakeInboxMoney", "AutoLootMailItem" }) do
            if type(Compat.Resolve(name)) == "function" then
                hooksecurefunc(name, function(index)
                    log.Info(name, "courrier", Util.Safe(index))
                end)
            else
                log.Info(name, "absente")
            end
        end
    end,
    commands = {
        { name = "lire", run = readInbox },
    },
})
