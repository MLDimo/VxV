local _, ns = ...

--- Ranking's boards as the website exports them (contract VXV-RANKING-1, packages/server/src/domain/addonRanking.ts):
--- every category over every period, its first places and records, and the members they show. Brought by the
--- companion and passed on by the officers.

--- The board of a category over a period, created empty.
local function boardOf(data, category, period)
    local key = category .. "|" .. period
    data.boards[key] = data.boards[key] or { metric = "", unit = "count", rows = {}, records = {} }
    return data.boards[key]
end

local function orNil(value)
    return value ~= "" and value or nil
end

ns.RankingData = VXV.SiteData({
    name = "ranking",
    header = "VXV-RANKING-1",
    New = function()
        return { season = 0, members = {}, boards = {} }
    end,
    lines = {
        -- S;the current season's number (0 without one)
        S = { 1, function(data, f)
            data.season = tonumber(f[1]) or 0
            return true
        end },
        -- U;member id;name;class token;portrait;title of the week
        U = { 5, function(data, f)
            data.members[f[1]] = { name = f[2], class = orNil(f[3]), avatar = orNil(f[4]), title = orNil(f[5]) }
            return true
        end },
        -- B;category;period;metric;unit
        B = { 4, function(data, f)
            local board = boardOf(data, f[1], f[2])
            board.metric, board.unit = f[3], f[4]
            return true
        end },
        -- R;category;period;rank;member id;value
        R = { 5, function(data, f)
            local rank, value = tonumber(f[3]), tonumber(f[5])
            if rank == nil or value == nil then
                return false
            end
            local rows = boardOf(data, f[1], f[2]).rows
            rows[#rows + 1] = { rank = rank, memberId = f[4], value = value }
            return true
        end },
        -- D;category;period;label;value as written;member id
        D = { 5, function(data, f)
            local records = boardOf(data, f[1], f[2]).records
            records[#records + 1] = { label = f[3], value = f[4], memberId = f[5] }
            return true
        end },
    },
})
