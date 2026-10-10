local ns = select(2, ...).Titles

--- The titles of the week as the website exports them (contract VXV-TITRES-1,
--- packages/server/src/domain/addonTitles.ts), brought by the player's companion or passed on by an officer's addon.
--- A title the website adds shows without any update of the addon (P13.6).
ns.TitlesData = VXV.SiteData({
    name = "titres",
    header = "VXV-TITRES-1",
    New = function()
        return { titles = {} }
    end,
    lines = {
        -- T;title id;name;rule;member id, empty for nobody;member;class token, empty without main;score
        T = { 7, function(data, f)
            local score = tonumber(f[7])
            data.titles[#data.titles + 1] = { id = f[1], name = f[2], rule = f[3],
                memberId = f[4] ~= "" and f[4] or nil, holder = f[5] ~= "" and f[5] or nil,
                class = f[6] ~= "" and f[6] or nil, score = score }
            return score ~= nil
        end },
    },
})
