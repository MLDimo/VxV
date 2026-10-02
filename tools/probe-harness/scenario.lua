-- Runs every probe command once. Note: the mocked C_Timer fires immediately, so burst summaries read 0.
Fire("ADDON_LOADED", "VXV_Probe")
Fire("PLAYER_LOGIN")
local run = SlashCmdList.VXVPROBE
for _, command in ipairs({
    "", "api run", "comm ping", "comm size RAID", "comm burst GUILD 5", "loot status",
    "names unit", "names roster", "api find masterloot", "api find", "files payload 1", "files check", "log 3", "report", "verbose", "clear",
}) do
    run(command)
end
Fire("ENCOUNTER_START", 663, "Lucifron", 9, 40)
Fire("LOOT_OPENED")
GiveMasterLoot(1, 2)
Fire("ENCOUNTER_END", 663, "Lucifron", 9, 40, 1, { secret = "SECRET" })
Fire("LOOT_HISTORY_UPDATE_DROP", 663, 1)
Fire("LOOT_HISTORY_UPDATE_DROP", 663, 1)
