-- Runs every probe command once. Note: the mocked C_Timer fires immediately, so burst summaries read 0.
Fire("ADDON_LOADED", "VXV_Probe")
Fire("PLAYER_LOGIN")
local run = SlashCmdList.VXVPROBE
for _, command in ipairs({
    "", "api run", "comm ping", "comm size RAID", "comm burst GUILD 5", "loot status", "loot give 1 2", "loot give",
    "names unit", "names roster", "names export", "api find masterloot", "api find", "files payload 1", "files check",
    "group status", "group invite Eole Hermes", "group invite", "group raid", "later group invite Eole Hermes",
    "rolls roll", "rolls button", "rolls button", "chat send", "chat send guild",
    "meter list", "meter read", "counters list", "counters list tuées", "professions list", "professions recipes",
    "journaux send", "journaux start", "journaux send", "journaux state", "journaux stop",
    "log 3", "report", "verbose", "clear",
}) do
    run(command)
end
Fire("ENCOUNTER_START", 663, "Lucifron", 9, 40)
Fire("LOOT_OPENED")
GiveMasterLoot(1, 2)
Fire("ENCOUNTER_END", 663, "Lucifron", 9, 40, 1, { secret = "SECRET" })
Fire("LOOT_HISTORY_UPDATE_DROP", 663, 1)
Fire("LOOT_HISTORY_UPDATE_DROP", 663, 1)
Fire("CHAT_MSG_SYSTEM", "SECRET")
Fire("PARTY_INVITE_REQUEST", "Eole Hermes")

-- Deaths: raid1 dies then is resurrected, raid2's state is secret.
run("deaths watch")
Tick()
DeadUnits.raid1, DeadUnits.raid2 = true, "SECRET"
Tick()
DeadUnits.raid1 = false
Tick()
Fire("GROUP_ROSTER_UPDATE")
Tick()
run("deaths watch")
Fire("PLAYER_DEAD")
Fire("RESURRECT_REQUEST", "Eole Hermes")

-- Counters: a kill between two diffs.
run("counters diff")
StatisticValues[1197] = StatisticValues[1197] + 1
run("counters diff")

-- Display: the guild window loads after the hooks are requested, then shows a row.
run("display on")
run("display on")
CommunitiesMemberListEntryMixin = { SetMember = function() end }
Fire("ADDON_LOADED", "Blizzard_Communities")
CommunitiesMemberListEntryMixin.SetMember(FakeRosterEntry)
-- Same with the modern guild window, whose list exposes a scroll box.
CommunitiesFrame = { MemberList = { ScrollBox = {} } }
Fire("ADDON_LOADED", "Blizzard_Communities")

-- Professions: window opened, then the classic API only.
Fire("TRADE_SKILL_SHOW")
C_TradeSkillUI, GetProfessions = nil, nil
run("professions list")
run("professions recipes")
GetNumTradeSkills = nil
run("professions recipes")
