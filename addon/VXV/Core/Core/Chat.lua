local ns = select(2, ...).Core

--- Messages of VXV in the player's chat window, always under the same colored prefix.
local Chat = {}
ns.Chat = Chat

local PREFIX = "|cff14b8a6VXV|r "

function Chat.Print(message)
    print(PREFIX .. message)
end
