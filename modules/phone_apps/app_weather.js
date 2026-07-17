/**
 * Điện thoại nhỏ - Module APP Thời tiết
 * Đã Mod: Cấu trúc giống hệt App Tin tức, lưu trữ độc lập theo ChatID.
 * Đã Fix: Triệt tiêu 100% lỗi nhấp nháy thanh cuộn (Scrollbar Thrashing) ở viền phải.
 */

(function () {
    'use strict';

    function waitForPhoneSystem(callback) {
        if (window.parent.PhoneSystem) {
            callback();
        } else {
            console.log('[APP Thời tiết] Đang đợi PhoneSystem tải...');
            setTimeout(function () { waitForPhoneSystem(callback); }, 100);
        }
    }

    waitForPhoneSystem(function () {
        console.log('[APP Thời tiết] PhoneSystem đã sẵn sàng, bắt đầu khởi tạo');

        const APP_ID = 'weather';
        const APP_NAME = 'Thời tiết';
        const APP_ICON = '<img src="https://api.iconify.design/mdi:weather-partly-cloudy.svg?color=white" style="width:70%;height:70%">';
        const APP_COLOR = 'linear-gradient(135deg, #56CCF2, #2F80ED)';

        // ============ Phần 1: Dữ liệu Cốt lõi ============

        function seededRandom(seed) {
            var s = seed | 0;
            return function() {
                s = (s + 0x6D2B79F5) | 0;
                var t = Math.imul(s ^ (s >>> 15), 1 | s);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            }
        }

        var WEATHER_TYPES = {
            sunny: { name: 'Nắng', icon: '☀️', svg: 'mdi:weather-sunny', category: 'clear', severity: 0 },
            few_clouds: { name: 'Ít mây', icon: '🌤️', svg: 'mdi:weather-partly-cloudy', category: 'cloudy', severity: 0.5 },
            partly_cloudy: { name: 'Nhiều mây', icon: '⛅', svg: 'mdi:weather-partly-cloudy', category: 'cloudy', severity: 1 },
            cloudy: { name: 'Âm u', icon: '☁️', svg: 'mdi:weather-cloudy', category: 'cloudy', severity: 2 },
            overcast: { name: 'U ám', icon: '🌥️', svg: 'mdi:cloud', category: 'cloudy', severity: 3 },
            light_rain: { name: 'Mưa nhỏ', icon: '🌧️', svg: 'mdi:weather-rainy', category: 'rain', severity: 4 },
            rain: { name: 'Mưa vừa', icon: '🌧️', svg: 'mdi:weather-pouring', category: 'rain', severity: 5 },
            heavy_rain: { name: 'Mưa to', icon: '⛈️', svg: 'mdi:weather-lightning-rainy', category: 'rain', severity: 6 },
            thunderstorm: { name: 'Mưa dông', icon: '⛈️', svg: 'mdi:weather-lightning', category: 'storm', severity: 7 },
            light_snow: { name: 'Tuyết nhỏ', icon: '🌨️', svg: 'mdi:weather-snowy', category: 'snow', severity: 4 },
            snow: { name: 'Tuyết vừa', icon: '❄️', svg: 'mdi:snowflake', category: 'snow', severity: 5 },
            heavy_snow: { name: 'Tuyết dày', icon: '❄️', svg: 'mdi:weather-snowy-heavy', category: 'snow', severity: 6 },
            fog: { name: 'Sương mù', icon: '🌫️', svg: 'mdi:weather-fog', category: 'fog', severity: 2 },
            haze: { name: 'Khói bụi', icon: '😷', svg: 'mdi:weather-hazy', category: 'haze', severity: 3 }
        };

        var SEASONS = {
            spring: { months: [3, 4, 5], name: 'Mùa xuân', baseTemp: 16, tempRange: 10, dayNightDiff: 8 },
            summer: { months: [6, 7, 8], name: 'Mùa hè', baseTemp: 28, tempRange: 6, dayNightDiff: 7 },
            autumn: { months: [9, 10, 11], name: 'Mùa thu', baseTemp: 18, tempRange: 10, dayNightDiff: 9 },
            winter: { months: [12, 1, 2], name: 'Mùa đông', baseTemp: 6, tempRange: 7, dayNightDiff: 10 }
        };

        var SPRING_TRANSITIONS = { sunny: { sunny: 30, few_clouds: 20, partly_cloudy: 30, cloudy: 15, fog: 5 }, few_clouds: { sunny: 25, few_clouds: 30, partly_cloudy: 30, cloudy: 10, fog: 5 }, partly_cloudy: { sunny: 15, few_clouds: 20, partly_cloudy: 30, cloudy: 30, fog: 5 }, cloudy: { sunny: 8, few_clouds: 10, partly_cloudy: 20, cloudy: 30, overcast: 22, light_rain: 10 }, overcast: { few_clouds: 5, partly_cloudy: 10, cloudy: 30, overcast: 30, light_rain: 20, fog: 5 }, light_rain: { cloudy: 15, overcast: 30, light_rain: 40, rain: 15 }, rain: { overcast: 10, light_rain: 35, rain: 40, heavy_rain: 15 }, heavy_rain: { light_rain: 20, rain: 45, heavy_rain: 35 }, fog: { sunny: 20, few_clouds: 15, partly_cloudy: 35, cloudy: 20, fog: 10 }, haze: { few_clouds: 10, partly_cloudy: 20, cloudy: 40, haze: 30 } };
        var SUMMER_TRANSITIONS = { sunny: { sunny: 40, few_clouds: 25, partly_cloudy: 20, cloudy: 7, thunderstorm: 8 }, few_clouds: { sunny: 30, few_clouds: 30, partly_cloudy: 20, cloudy: 10, thunderstorm: 10 }, partly_cloudy: { sunny: 20, few_clouds: 20, partly_cloudy: 25, cloudy: 20, thunderstorm: 15 }, cloudy: { sunny: 10, few_clouds: 15, partly_cloudy: 25, cloudy: 25, overcast: 15, thunderstorm: 10 }, overcast: { partly_cloudy: 15, cloudy: 30, overcast: 25, light_rain: 15, thunderstorm: 15 }, light_rain: { cloudy: 20, overcast: 25, light_rain: 30, rain: 15, thunderstorm: 10 }, rain: { overcast: 15, light_rain: 30, rain: 30, heavy_rain: 15, thunderstorm: 10 }, heavy_rain: { rain: 35, heavy_rain: 35, thunderstorm: 30 }, thunderstorm: { sunny: 15, few_clouds: 15, partly_cloudy: 25, cloudy: 20, rain: 15, thunderstorm: 10 }, fog: { sunny: 40, few_clouds: 20, partly_cloudy: 30, fog: 10 }, haze: { few_clouds: 20, partly_cloudy: 30, cloudy: 20, haze: 30 } };
        var AUTUMN_TRANSITIONS = { sunny: { sunny: 50, few_clouds: 25, partly_cloudy: 15, cloudy: 8, fog: 2 }, few_clouds: { sunny: 30, few_clouds: 35, partly_cloudy: 20, cloudy: 13, fog: 2 }, partly_cloudy: { sunny: 20, few_clouds: 25, partly_cloudy: 35, cloudy: 18, fog: 2 }, cloudy: { sunny: 15, few_clouds: 15, partly_cloudy: 25, cloudy: 35, overcast: 8, fog: 2 }, overcast: { few_clouds: 5, partly_cloudy: 15, cloudy: 40, overcast: 30, light_rain: 10 }, light_rain: { cloudy: 25, overcast: 35, light_rain: 30, rain: 10 }, rain: { overcast: 20, light_rain: 40, rain: 35, heavy_rain: 5 }, heavy_rain: { light_rain: 30, rain: 50, heavy_rain: 20 }, fog: { sunny: 30, few_clouds: 15, partly_cloudy: 30, cloudy: 15, fog: 10 }, haze: { few_clouds: 15, partly_cloudy: 20, cloudy: 30, overcast: 10, haze: 25 } };
        var WINTER_TRANSITIONS = { sunny: { sunny: 35, few_clouds: 25, partly_cloudy: 20, cloudy: 15, fog: 5 }, few_clouds: { sunny: 20, few_clouds: 30, partly_cloudy: 25, cloudy: 20, fog: 5 }, partly_cloudy: { sunny: 15, few_clouds: 20, partly_cloudy: 30, cloudy: 30, fog: 5 }, cloudy: { sunny: 5, few_clouds: 10, partly_cloudy: 20, cloudy: 40, overcast: 20, fog: 5 }, overcast: { partly_cloudy: 8, cloudy: 30, overcast: 35, light_snow: 15, light_rain: 12 }, light_rain: { cloudy: 20, overcast: 35, light_rain: 30, rain: 10, light_snow: 5 }, rain: { overcast: 20, light_rain: 40, rain: 30, heavy_rain: 5, snow: 5 }, heavy_rain: { light_rain: 25, rain: 45, heavy_rain: 20, snow: 10 }, light_snow: { cloudy: 15, overcast: 30, light_snow: 40, snow: 15 }, snow: { overcast: 15, light_snow: 35, snow: 40, heavy_snow: 10 }, heavy_snow: { light_snow: 20, snow: 50, heavy_snow: 30 }, fog: { sunny: 20, few_clouds: 15, partly_cloudy: 25, cloudy: 25, fog: 15 }, haze: { few_clouds: 10, partly_cloudy: 15, cloudy: 30, overcast: 20, haze: 25 } };
        var SEASON_TRANSITIONS = { spring: SPRING_TRANSITIONS, summer: SUMMER_TRANSITIONS, autumn: AUTUMN_TRANSITIONS, winter: WINTER_TRANSITIONS };

        var TIME_PERIOD_MODIFIERS = { dawn: { hours: [0, 2, 4], fogChance: 0.15, thunderstormChance: 0.02 }, morning: { hours: [6, 8], fogChance: 0.08, thunderstormChance: 0.05 }, midday: { hours: [10, 12], fogChance: 0.01, thunderstormChance: 0.10 }, afternoon: { hours: [14, 16], fogChance: 0.01, thunderstormChance: 0.25 }, evening: { hours: [18, 20], fogChance: 0.03, thunderstormChance: 0.08 }, night: { hours: [22], fogChance: 0.10, thunderstormChance: 0.03 } };
        var WEATHER_PERSISTENCE = { sunny: { minDuration: 3, maxDuration: 24, stability: 0.85 }, few_clouds: { minDuration: 2, maxDuration: 18, stability: 0.80 }, partly_cloudy: { minDuration: 2, maxDuration: 12, stability: 0.70 }, cloudy: { minDuration: 2, maxDuration: 16, stability: 0.75 }, overcast: { minDuration: 2, maxDuration: 10, stability: 0.70 }, light_rain: { minDuration: 2, maxDuration: 14, stability: 0.65 }, rain: { minDuration: 1, maxDuration: 8, stability: 0.60 }, heavy_rain: { minDuration: 1, maxDuration: 4, stability: 0.50 }, thunderstorm: { minDuration: 1, maxDuration: 3, stability: 0.40 }, light_snow: { minDuration: 2, maxDuration: 16, stability: 0.70 }, snow: { minDuration: 2, maxDuration: 10, stability: 0.65 }, heavy_snow: { minDuration: 1, maxDuration: 6, stability: 0.55 }, fog: { minDuration: 1, maxDuration: 6, stability: 0.50 }, haze: { minDuration: 3, maxDuration: 12, stability: 0.75 } };
        var TEMP_CURVE = { 0: 0.15, 2: 0.08, 4: 0.02, 6: 0.10, 8: 0.30, 10: 0.55, 12: 0.80, 14: 1.00, 16: 0.95, 18: 0.75, 20: 0.50, 22: 0.30 };
        var WEATHER_TEMP_MODIFIERS = { sunny: { dayBonus: 3, nightBonus: -1 }, few_clouds: { dayBonus: 2, nightBonus: 0 }, partly_cloudy: { dayBonus: 1, nightBonus: 0 }, cloudy: { dayBonus: -2, nightBonus: 2 }, overcast: { dayBonus: -3, nightBonus: 3 }, light_rain: { dayBonus: -5, nightBonus: 0 }, rain: { dayBonus: -6, nightBonus: -1 }, heavy_rain: { dayBonus: -8, nightBonus: -2 }, thunderstorm: { dayBonus: -7, nightBonus: -3 }, light_snow: { dayBonus: -4, nightBonus: -2 }, snow: { dayBonus: -6, nightBonus: -3 }, heavy_snow: { dayBonus: -8, nightBonus: -4 }, fog: { dayBonus: -2, nightBonus: 2 }, haze: { dayBonus: -1, nightBonus: 1 } };

        function weatherSvg(weatherType, size, color) {
            var info = WEATHER_TYPES[weatherType];
            if (!info || !info.svg) return info ? info.icon : '🌤️';
            var c = color || '%23ffffff';
            return '<img src="https://api.iconify.design/' + info.svg + '.svg?color=' + c + '" style="width:' + size + 'px;height:' + size + 'px;vertical-align:middle;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.25));">';
        }

        function iconSvg(name, size, color) {
            var c = color || '%23ffffff';
            return '<img src="https://api.iconify.design/' + name + '.svg?color=' + c + '" style="width:' + size + 'px;height:' + size + 'px;vertical-align:middle;">';
        }

        function dateToSeed(year, month, day) { return year * 10000 + month * 100 + day; }
        function getSeason(month) {
            for (var seasonKey in SEASONS) {
                var seasonData = SEASONS[seasonKey];
                if (seasonData.months.indexOf(month) !== -1) {
                    return { key: seasonKey, name: seasonData.name, baseTemp: seasonData.baseTemp, tempRange: seasonData.tempRange, dayNightDiff: seasonData.dayNightDiff, months: seasonData.months };
                }
            }
            return { key: 'spring', name: SEASONS.spring.name, baseTemp: SEASONS.spring.baseTemp, tempRange: SEASONS.spring.tempRange, dayNightDiff: SEASONS.spring.dayNightDiff, months: SEASONS.spring.months };
        }
        function getTimePeriod(hour) {
            if (hour >= 0 && hour < 6) return 'dawn';
            if (hour >= 6 && hour < 10) return 'morning';
            if (hour >= 10 && hour < 14) return 'midday';
            if (hour >= 14 && hour < 18) return 'afternoon';
            if (hour >= 18 && hour < 22) return 'evening';
            return 'night';
        }

        function weightedRandom(weights, random) {
            var entries = [];
            for (var key in weights) entries.push([key, weights[key]]);
            var totalWeight = 0;
            for (var i = 0; i < entries.length; i++) totalWeight += entries[i][1];
            if (totalWeight === 0) return entries[0] ? entries[0][0] : 'sunny';
            var randomValue = random() * totalWeight;
            var cumulative = 0;
            for (var j = 0; j < entries.length; j++) {
                cumulative += entries[j][1];
                if (randomValue < cumulative) return entries[j][0];
            }
            return entries[0][0];
        }

        function getWeekdayName(dayIndex) { var names = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']; return names[dayIndex]; }

        function getSeasonInitialWeights(seasonKey) {
            var weights = {
                spring: { sunny: 20, few_clouds: 15, partly_cloudy: 25, cloudy: 25, light_rain: 10, fog: 5 },
                summer: { sunny: 35, few_clouds: 20, partly_cloudy: 20, cloudy: 15, thunderstorm: 10 },
                autumn: { sunny: 30, few_clouds: 20, partly_cloudy: 25, cloudy: 20, fog: 5 },
                winter: { sunny: 15, few_clouds: 15, partly_cloudy: 25, cloudy: 30, light_snow: 10, fog: 5 }
            };
            return weights[seasonKey] || weights.spring;
        }

        function evolveWeather(currentWeather, currentDuration, seasonKey, hour, random) {
            var persistence = WEATHER_PERSISTENCE[currentWeather] || WEATHER_PERSISTENCE.sunny;
            var transitions = SEASON_TRANSITIONS[seasonKey] || SPRING_TRANSITIONS;
            var period = getTimePeriod(hour);
            var periodMod = TIME_PERIOD_MODIFIERS[period];
            var changeChance = 1 - persistence.stability;

            if (currentDuration >= persistence.minDuration) {
                var overTime = currentDuration - persistence.minDuration;
                var maxOverTime = persistence.maxDuration - persistence.minDuration;
                changeChance += (overTime / maxOverTime) * 0.5;
            }
            if (currentDuration < persistence.minDuration) changeChance *= 0.2;

            if (seasonKey === 'summer' && period === 'afternoon') {
                if (currentWeather === 'sunny' || currentWeather === 'few_clouds' || currentWeather === 'partly_cloudy') {
                    if (random() < periodMod.thunderstormChance) return { weather: 'thunderstorm', duration: 1 };
                }
            }
            if (period === 'dawn' && currentWeather !== 'fog' && (currentWeather === 'cloudy' || currentWeather === 'partly_cloudy' || currentWeather === 'few_clouds' || currentWeather === 'sunny')) {
                if (random() < periodMod.fogChance) return { weather: 'fog', duration: 1 };
            }
            if (period === 'morning' && currentWeather === 'fog' && currentDuration >= 2) {
                if (random() < 0.6) return { weather: 'sunny', duration: 1 };
            }
            if (random() > changeChance) return { weather: currentWeather, duration: currentDuration + 1 };

            var transitionWeights = transitions[currentWeather] || { sunny: 30, partly_cloudy: 40, cloudy: 30 };
            var filteredWeights = {};
            for (var weather in transitionWeights) {
                if (weather !== currentWeather) filteredWeights[weather] = transitionWeights[weather];
            }
            if (Object.keys(filteredWeights).length === 0) return { weather: currentWeather, duration: currentDuration + 1 };

            var newWeather = weightedRandom(filteredWeights, random);
            return { weather: newWeather, duration: 1 };
        }

        function generateContinuousWeatherStream(startYear, startMonth, startDay, initialWeather, totalSlots) {
            if (!totalSlots) totalSlots = 84;
            var baseSeed = dateToSeed(startYear, startMonth, startDay);
            var random = seededRandom(baseSeed);
            var slots = [];
            var startDate = new Date(startYear, startMonth - 1, startDay);
            var currentWeather = initialWeather;
            var currentDuration = 1;

            if (!currentWeather) {
                var season = getSeason(startMonth);
                var seasonWeights = getSeasonInitialWeights(season.key);
                currentWeather = weightedRandom(seasonWeights, random);
            }

            for (var slotIndex = 0; slotIndex < totalSlots; slotIndex++) {
                var slotDate = new Date(startDate.getTime() + slotIndex * 2 * 60 * 60 * 1000);
                var year = slotDate.getFullYear();
                var month = slotDate.getMonth() + 1;
                var day = slotDate.getDate();
                var hour = slotDate.getHours();
                var season = getSeason(month);
                var slotSeed = baseSeed * 100 + slotIndex;
                var slotRandom = seededRandom(slotSeed);

                slots.push({ slotIndex: slotIndex, year: year, month: month, day: day, hour: hour, weather: currentWeather, season: season.key });

                var evolved = evolveWeather(currentWeather, currentDuration, season.key, hour, slotRandom);
                if (evolved.weather === currentWeather) currentDuration = evolved.duration;
                else { currentWeather = evolved.weather; currentDuration = 1; }
            }
            return slots;
        }

        function aggregateToDaily(slots) {
            var dailyMap = {};
            for (var i = 0; i < slots.length; i++) {
                var slot = slots[i];
                var dateKey = slot.year + '-' + slot.month + '-' + slot.day;
                if (!dailyMap[dateKey]) {
                    dailyMap[dateKey] = {
                        year: slot.year, month: slot.month, day: slot.day,
                        date: String(slot.month).padStart(2, '0') + '-' + String(slot.day).padStart(2, '0'),
                        weekday: getWeekdayName(new Date(slot.year, slot.month - 1, slot.day).getDay()),
                        slots: [], weatherCounts: {}, season: slot.season
                    };
                }
                var dayData = dailyMap[dateKey];
                dayData.slots.push(slot);
                dayData.weatherCounts[slot.weather] = (dayData.weatherCounts[slot.weather] || 0) + 1;
            }

            var dailyList = [];
            for (var key in dailyMap) {
                var dayData = dailyMap[key];
                var dominantWeather = 'sunny';
                var maxCount = 0;
                for (var weather in dayData.weatherCounts) {
                    if (dayData.weatherCounts[weather] > maxCount) {
                        maxCount = dayData.weatherCounts[weather];
                        dominantWeather = weather;
                    }
                }
                var weatherInfo = WEATHER_TYPES[dominantWeather] || WEATHER_TYPES.sunny;
                var hourly = [];
                for (var j = 0; j < dayData.slots.length; j++) {
                    var slot = dayData.slots[j];
                    var slotWeatherInfo = WEATHER_TYPES[slot.weather] || WEATHER_TYPES.sunny;
                    hourly.push({ time: String(slot.hour).padStart(2, '0') + ':00', weather: slot.weather, weatherName: slotWeatherInfo.name, icon: slotWeatherInfo.icon, temp: 0 });
                }
                dailyList.push({
                    date: dayData.date, year: dayData.year, month: dayData.month, day: dayData.day, weekday: dayData.weekday,
                    weather: dominantWeather, weatherName: weatherInfo.name, icon: weatherInfo.icon, category: weatherInfo.category,
                    tempHigh: 0, tempLow: 0, hourly: hourly, season: dayData.season
                });
            }

            dailyList.sort(function(a, b) {
                if (a.year !== b.year) return a.year - b.year;
                if (a.month !== b.month) return a.month - b.month;
                return a.day - b.day;
            });
            return dailyList;
        }

        function generateTemperatures(dailyForecast, startYear, startMonth, startDay) {
            var baseSeed = dateToSeed(startYear, startMonth, startDay);
            var prevDayAvgTemp = null;

            for (var dayIndex = 0; dayIndex < dailyForecast.length; dayIndex++) {
                var dayData = dailyForecast[dayIndex];
                var season = SEASONS[dayData.season] || SEASONS.spring;
                var daySeed = baseSeed + dayIndex * 1000;
                var random = seededRandom(daySeed);
                var baseTemp = season.baseTemp + (random() - 0.5) * season.tempRange;

                if (prevDayAvgTemp !== null) {
                    var maxChange = 5;
                    baseTemp = Math.max(prevDayAvgTemp - maxChange, Math.min(prevDayAvgTemp + maxChange, baseTemp));
                }

                var weatherMod = WEATHER_TEMP_MODIFIERS[dayData.weather] || { dayBonus: 0, nightBonus: 0 };
                var avgWeatherMod = (weatherMod.dayBonus + weatherMod.nightBonus) / 2;
                baseTemp += avgWeatherMod;

                var dayNightDiff = season.dayNightDiff;
                var tempHigh = Math.round(baseTemp + dayNightDiff / 2);
                var tempLow = Math.round(baseTemp - dayNightDiff / 2);

                dayData.tempHigh = tempHigh;
                dayData.tempLow = tempLow;

                if (dayData.hourly) {
                    for (var h = 0; h < dayData.hourly.length; h++) {
                        var hourData = dayData.hourly[h];
                        var hour = parseInt(hourData.time.split(':')[0]);
                        var curve = TEMP_CURVE[hour] !== undefined ? TEMP_CURVE[hour] : 0.5;
                        var temp = tempLow + (tempHigh - tempLow) * curve;
                        var hourWeatherMod = WEATHER_TEMP_MODIFIERS[hourData.weather] || { dayBonus: 0, nightBonus: 0 };
                        var isDay = hour >= 6 && hour < 18;
                        temp += isDay ? hourWeatherMod.dayBonus * 0.3 : hourWeatherMod.nightBonus * 0.3;
                        hourData.temp = Math.round(temp);
                    }
                }
                prevDayAvgTemp = baseTemp;
            }
        }

        function generateWeatherForecast(year, month, day, currentWeather, lastWeatherOfPreviousDay) {
            var initialWeather = lastWeatherOfPreviousDay || currentWeather;
            var weatherStream = generateContinuousWeatherStream(year, month, day, initialWeather, 84);
            var dailyForecast = aggregateToDaily(weatherStream);
            generateTemperatures(dailyForecast, year, month, day);

            var season = getSeason(month);
            var currentHour = new Date().getHours();
            var timePoint = Math.floor(currentHour / 2) * 2;
            var timeStr = String(timePoint).padStart(2, '0') + ':00';

            var currentTemp = Math.round((dailyForecast[0].tempHigh + dailyForecast[0].tempLow) / 2);
            var currentWeatherName = dailyForecast[0].weatherName;
            var currentIcon = dailyForecast[0].icon;
            var currentWeatherType = dailyForecast[0].weather;

            if (dailyForecast[0].hourly) {
                for (var i = 0; i < dailyForecast[0].hourly.length; i++) {
                    var h = dailyForecast[0].hourly[i];
                    if (h.time === timeStr) {
                        currentTemp = h.temp; currentWeatherName = h.weatherName; currentIcon = h.icon; currentWeatherType = h.weather;
                        break;
                    }
                }
            }

            return {
                current: { weather: currentWeatherType, weatherName: currentWeatherName, icon: currentIcon, temperature: currentTemp, tempHigh: dailyForecast[0].tempHigh, tempLow: dailyForecast[0].tempLow },
                forecast: dailyForecast,
                lastUpdateDate: year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0'),
                season: season.key
            };
        }

        // ============ Phần 2: Quản lý Hệ thống Thời tiết (WeatherSystem) ============
        
        var WeatherSystem = {
            currentChatId: null,
            data: null, // Mặc định là null khi chưa có dữ liệu
            isLoading: false,

            getChatId: function() {
                try {
                    var ctx = window.parent.SillyTavern && window.parent.SillyTavern.getContext && window.parent.SillyTavern.getContext();
                    if (!ctx) return 'default';
                    if (typeof ctx.getCurrentChatId === 'function') {
                        var chatId = ctx.getCurrentChatId();
                        if (chatId) return String(chatId);
                    }
                    if (ctx.chatId) return String(ctx.chatId);
                    if (ctx.characterId !== undefined && ctx.characters && ctx.characters[ctx.characterId]) {
                        var charChat = ctx.characters[ctx.characterId].chat;
                        if (charChat) return String(charChat);
                    }
                    return 'default';
                } catch (e) { return 'default'; }
            },

            getStorageKey: function(suffix) {
                return 'phone_weather_' + this.getChatId() + '_' + suffix;
            },

            getRecentChatHistory: function() {
                try {
                    var ctx = window.parent.SillyTavern?.getContext?.();
                    if (!ctx || !ctx.chat || !Array.isArray(ctx.chat)) return '';
                    var recentMessages = ctx.chat.slice(-15);
                    var historyText = '';
                    for (var i = 0; i < recentMessages.length; i++) {
                        var msg = recentMessages[i];
                        if (msg && msg.mes) {
                            var cleanText = msg.mes
    .replace(/<!--[\s\S]*?-->/g, '') // Xóa triệt để các block comment HTML (Điểm neo, Số chữ...) nhiều dòng
    .replace(/<[^>]*>/g, '')         // Xóa các thẻ HTML thông thường (<br>, <i>...)
    .replace(/\{\{[^}]*\}\}/g, '')   // Xóa macro {{...}}
    .replace(/\[\[[^\]]*\]\]/g, '')  // Xóa macro [[...]]
    .trim();
                            if (cleanText) {
                                historyText += `${msg.is_user ? 'Người chơi' : 'Nhân vật'}: ${cleanText}\n`;
                            }
                        }
                    }
                    return historyText;
                } catch (e) { return ''; }
            },

            fetchWeatherFromAPI: async function() {
                console.log('[APP Thời tiết] Gọi API phân tích bối cảnh...');
                try {
                    var settings = window.parent.PhoneSystem.getSettings();
                    if (!settings.apiConfig || !settings.apiConfig.apiKey) throw new Error('Chưa cấu hình API Key');

                    var chatHistory = this.getRecentChatHistory();
                    var contextPrompt = chatHistory ? `Dưới đây là tóm tắt bối cảnh câu chuyện:\n\n${chatHistory}\n\n` : `Chưa có bối cảnh.\n\n`;
                    var systemPrompt = `Bạn là hệ thống dự báo thời tiết Roleplay. Đọc bối cảnh và trả về JSON mã thời tiết (sunny, few_clouds, partly_cloudy, cloudy, overcast, light_rain, rain, heavy_rain, thunderstorm, light_snow, snow, heavy_snow, fog, haze) và ngày tháng.
Chỉ trả về JSON định dạng: {"weatherCode":"...","year":2024,"month":5,"day":1}`;

                    var result = await window.parent.PhoneSystem.callExternalAPI([
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `${contextPrompt}Phân tích ngày tháng và thời tiết hiện tại. Chỉ xuất ra JSON.` }
                    ]);

                    if (result) {
                        var jsonMatch = result.match(/\{[\s\S]*\}/);
                        if (jsonMatch) return JSON.parse(jsonMatch[0]);
                    }
                    throw new Error('AI không trả về JSON hợp lệ');
                } catch (e) {
                    console.error('[APP Thời tiết] Lỗi API:', e);
                    if (window.parent.toastr) window.parent.toastr.warning('Lỗi thời tiết: ' + e.message);
                    return null;
                }
            },

            updateWeatherForecast: async function(iframeDoc) {
                if (this.isLoading) return;
                this.isLoading = true;
                
                // Hiển thị trạng thái Đang tải ngay lập tức
                if (iframeDoc) renderWeatherUI(iframeDoc);

                try {
                    var aiData = await this.fetchWeatherFromAPI();
                    var year = 2024, month = 5, day = 1, baseWeather = 'sunny';

                    if (aiData) {
                        year = parseInt(aiData.year) || 2024; month = parseInt(aiData.month) || 5; day = parseInt(aiData.day) || 1;
                        if (WEATHER_TYPES[aiData.weatherCode]) baseWeather = aiData.weatherCode;
                    }

                    var currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    var weatherData = generateWeatherForecast(year, month, day, baseWeather, null);

                    this.data = {
                        current: weatherData.current,
                        forecast: weatherData.forecast,
                        lastUpdateDate: currentDateStr,
                        season: weatherData.season,
                        previousHour: new Date().getHours()
                    };

                    localStorage.setItem(this.getStorageKey('data'), JSON.stringify(this.data));
                    if (window.parent.toastr) window.parent.toastr.success('Phân tích thời tiết thành công!');

                } catch (e) {
                    console.error('[APP Thời tiết] Lỗi khi cập nhật:', e);
                } finally {
                    this.isLoading = false;
                    // Render lại giao diện sau khi có dữ liệu
                    if (iframeDoc) renderWeatherUI(iframeDoc);
                }
            },

            loadWeatherForCurrentChat: function() {
                this.currentChatId = this.getChatId();
                var savedData = localStorage.getItem(this.getStorageKey('data'));
                if (savedData) {
                    this.data = JSON.parse(savedData);
                } else {
                    this.data = null; // Cố tình để null để hiển thị màn hình Trống
                }
            },

            ensureCurrentChatWeather: function() {
                var currentChatId = this.getChatId();
                if (currentChatId !== this.currentChatId) {
                    console.log('[APP Thời tiết] Chuyển đổi ChatID, tải lại dữ liệu cục bộ');
                    this.loadWeatherForCurrentChat();
                }
            },
            
            getCurrentGameHour: function() { return new Date().getHours(); }
        };

        // ============ Phần 3: Giao diện UI ============

        function getStaticBackground(weatherType, timeState) {
            var info = WEATHER_TYPES[weatherType];
            var cat = info ? info.category : 'clear';
            if (weatherType === 'partly_cloudy' || weatherType === 'few_clouds') cat = 'clear'; 
            var gradients = {
                clear: { dawn: 'linear-gradient(180deg, #112A46 0%, #436382 50%, #E6886A 100%)', day: 'linear-gradient(180deg, #3780E5 0%, #7AC5F8 100%)', dusk: 'linear-gradient(180deg, #1A2A42 0%, #5B546A 50%, #D88961 100%)', night: 'linear-gradient(180deg, #05132A 0%, #0F2A4A 100%)' },
                cloudy: { dawn: 'linear-gradient(180deg, #3A4C5E 0%, #5A6D81 100%)', day: 'linear-gradient(180deg, #627C94 0%, #9FB4C8 100%)', dusk: 'linear-gradient(180deg, #384252 0%, #5C6272 100%)', night: 'linear-gradient(180deg, #131A26 0%, #202A3A 100%)' },
                rain: { dawn: 'linear-gradient(180deg, #2C3A47 0%, #465563 100%)', day: 'linear-gradient(180deg, #4A5B6E 0%, #6B7D91 100%)', dusk: 'linear-gradient(180deg, #24303E 0%, #3B4756 100%)', night: 'linear-gradient(180deg, #0E1621 0%, #1A2534 100%)' },
                storm: { dawn: 'linear-gradient(180deg, #1A1F26 0%, #2D3743 100%)', day: 'linear-gradient(180deg, #26313F 0%, #3B4B5E 100%)', dusk: 'linear-gradient(180deg, #151A21 0%, #242D38 100%)', night: 'linear-gradient(180deg, #0A0D12 0%, #121822 100%)' },
                snow: { dawn: 'linear-gradient(180deg, #5C7694 0%, #85A0C2 100%)', day: 'linear-gradient(180deg, #81A1C1 0%, #B8D0E8 100%)', dusk: 'linear-gradient(180deg, #4A607A 0%, #6E87A5 100%)', night: 'linear-gradient(180deg, #1A283B 0%, #2D4360 100%)' },
                fog: { dawn: 'linear-gradient(180deg, #66707C 0%, #8B97A4 100%)', day: 'linear-gradient(180deg, #7B8B9B 0%, #A5B6C6 100%)', dusk: 'linear-gradient(180deg, #4E5762 0%, #6E7986 100%)', night: 'linear-gradient(180deg, #1D232A 0%, #2F3945 100%)' }
            };
            return (gradients[cat] || gradients.clear)[timeState] || gradients.clear.day;
        }

        function generateDynamicLayer(weatherType, timeState, season) {
            var info = WEATHER_TYPES[weatherType];
            var category = info ? info.category : 'clear';
            var isNight = (timeState === 'night');
            var html = '';

            if (category === 'clear' || weatherType === 'partly_cloudy' || weatherType === 'few_clouds') {
                if (isNight) {
                    html += '<div style="position:absolute; top: 60px; left: 40px; width: 60px; height: 60px; background: #FFFDE7; border-radius: 50%; box-shadow: 0 0 40px 15px rgba(255,255,255,0.15);"></div>';
                    let starSvg = "data:image/svg+xml," + encodeURIComponent('<svg width="150" height="150" xmlns="http://www.w3.org/2000/svg"><circle cx="15" cy="15" r="1" fill="white" opacity="0.8"/><circle cx="80" cy="50" r="1.5" fill="white" opacity="0.5"/><circle cx="120" cy="110" r="0.5" fill="white" opacity="0.7"/></svg>');
                    html += `<div style="position:absolute; top:0; left:0; width:200%; height:200%; background: transparent url('${starSvg}') repeat; animation: snowFall 250s linear infinite;"></div>`;
                } else {
                    var sunColor = (timeState === 'dawn' || timeState === 'dusk') ? 'rgba(255,120,50,0.8)' : 'rgba(255,230,100,0.8)';
                    html += `<div style="position:absolute; top: -20px; right: -20px; width: 160px; height: 160px; background: radial-gradient(circle, ${sunColor} 0%, rgba(255,255,255,0.2) 40%, transparent 70%); filter: blur(8px); border-radius: 50%; animation: sunPulse 6s ease-in-out infinite;"></div>`;
                }
            }

            if (category === 'cloudy' || weatherType === 'partly_cloudy' || weatherType === 'few_clouds' || category === 'rain' || category === 'storm') {
                let cloudCount = 0, scaleMax = 1;
                if (weatherType === 'few_clouds') cloudCount = 3;
                else if (weatherType === 'partly_cloudy') cloudCount = 6;
                else if (weatherType === 'cloudy') { cloudCount = 12; scaleMax = 1.4; }
                else if (weatherType === 'overcast' || category === 'rain' || category === 'storm') { cloudCount = 18; scaleMax = 1.8; }

                let isDarkCloud = (category === 'storm' || weatherType === 'overcast' || category === 'rain');
                let cloudColorBase = isNight ? (isDarkCloud ? '#222222' : '#666666') : (isDarkCloud ? '#5a646e' : '#ffffff');
                let cloudSvg = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 110 70"><path d="M 25 45 A 15 15 0 0 1 25 15 A 20 20 0 0 1 65 12 A 18 18 0 0 1 90 28 A 12 12 0 0 1 85 52 Z" fill="${cloudColorBase}"/></svg>`);

                for(let i=0; i<cloudCount; i++) {
                    let top = Math.random() * 25 - 15; 
                    if (!(weatherType === 'few_clouds' || weatherType === 'partly_cloudy')) {
                        let depthRatio = i / cloudCount;
                        if (depthRatio >= 0.5 && depthRatio < 0.8) top = Math.random() * 15 + 10;  
                        else if (depthRatio >= 0.8) top = Math.random() * 20 + 25; 
                    }
                    let w = (Math.random() * 120 + 150) * scaleMax, opacity = Math.random() * 0.4 + (isDarkCloud ? 0.5 : 0.3), dur = Math.random() * 30 + 50, delay = Math.random() * -80; 
                    html += `<div class="p-cloud" style="top:${top}%; left: 0; transform: translateX(-350px); width:${w}px; height:${w*0.6}px; opacity:${opacity}; background-image:url('${cloudSvg}'); animation: cloudDrift ${dur}s linear infinite ${delay}s;"></div>`;
                }
            }

            if (category === 'rain' || category === 'storm') {
                let dropCount = (weatherType === 'heavy_rain' || category === 'storm') ? 130 : (weatherType === 'light_rain') ? 35 : 80;
                for(let i=0; i<dropCount; i++) {
                    let left = Math.random() * 150 - 20, depth = Math.random(), w, h, opacity, dur;
                    if (depth < 0.3) { w = 1; h = 15; opacity = Math.random() * 0.2 + 0.1; dur = Math.random() * 0.2 + 0.6; } 
                    else if (depth < 0.7) { w = 1.5; h = 25; opacity = Math.random() * 0.3 + 0.3; dur = Math.random() * 0.2 + 0.4; } 
                    else { w = 2; h = 40; opacity = Math.random() * 0.4 + 0.5; dur = Math.random() * 0.1 + 0.25; }
                    if (weatherType === 'heavy_rain' || category === 'storm') dur *= 0.6; 
                    html += `<div class="p-rain" style="top:-50px; left:${left}%; width:${w}px; height:${h}px; opacity:${opacity}; animation: dropFall ${dur}s linear infinite ${Math.random() * -2}s;"></div>`;
                }
                if (category === 'storm') html += '<div style="position:absolute; top:0; left:0; width:100%; height:100%; animation: flashLightning 6s infinite;"></div>'; 
            } else if (category === 'snow') {
                let snowCount = (weatherType === 'heavy_snow') ? 100 : (weatherType === 'light_snow') ? 25 : 60;
                for(let i=0; i<snowCount; i++) {
                    let depth = Math.random();
                    let size = depth < 0.4 ? (Math.random()*2+2) : (Math.random()*3+4); 
                    html += `<div class="p-snow" style="top:-50px; left:${Math.random() * 120 - 10}%; width:${size}px; height:${size}px; opacity:${depth < 0.4 ? 0.4 : 0.8}; animation: snowFall ${depth < 0.4 ? (Math.random()*4+5) : (Math.random()*3+3)}s ease-in-out infinite ${Math.random() * -5}s;"></div>`;
                }
            } else if (category === 'fog' || category === 'haze') {
                html += '<div style="position:absolute; bottom:0; left:-20%; width:140%; height:60%; background:linear-gradient(to top, rgba(255,255,255,0.7) 0%, transparent 100%); filter:blur(25px); animation: fogDrift 15s ease-in-out infinite;"></div>';
            }

            if (category !== 'rain' && category !== 'storm' && category !== 'snow' && category !== 'fog') {
                if (season === 'spring') {
                    let petalSvg = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2c-4 4-4 10 0 14 4-4 4-10 0-14z" fill="#ffb7c5" opacity="0.9"/></svg>');
                    for(let i=0; i<15; i++) html += `<div class="p-leaf" style="top:-50px; left:${Math.random() * 120 - 10}%; background:url('${petalSvg}') no-repeat center/contain; animation: leafFall ${Math.random() * 5 + 7}s ease-in-out infinite ${Math.random() * -10}s;"></div>`;
                } else if (season === 'autumn') {
                    let leafSvg = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17 8C8 10 6 16 4 21l2 1 1-2c.5.2 1 .3 1 .3C19 20 22 3 22 3c-1 2-8 2-13 3-5 1-7 5-7 7 0 2 2 4 2 4 3-9 13-9 13-9z" fill="#e67e22" opacity="0.85"/></svg>');
                    for(let i=0; i<15; i++) html += `<div class="p-leaf" style="top:-50px; left:${Math.random() * 120 - 10}%; background:url('${leafSvg}') no-repeat center/contain; animation: leafFall ${Math.random() * 6 + 6}s ease-in-out infinite ${Math.random() * -10}s;"></div>`;
                }
            }
            return html;
        }

        // ĐÃ SỬA CHỮA: Thêm -ms-overflow-style và scrollbar-width vào các thẻ cuộn
        var cssRules = '<style id="weather-app-styles">' +
            '.weather-ui-layer, .hourly-scroll-container { -ms-overflow-style: none; scrollbar-width: none; }' +
            '.weather-ui-layer::-webkit-scrollbar, .hourly-scroll-container::-webkit-scrollbar { display: none; width: 0; height: 0; }' +
            '@keyframes dropFall { 0% { transform: translate(0, 0) rotate(15deg); opacity: 0; } 10% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translate(-150px, 850px) rotate(15deg); opacity: 0; } }' +
            '@keyframes snowFall { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(850px) translateX(30px) rotate(180deg); opacity: 0; } }' +
            '@keyframes leafFall { 0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 50% { transform: translateY(400px) translateX(40px) rotate(180deg); } 100% { transform: translateY(850px) translateX(-20px) rotate(360deg); opacity: 0; } }' +
            '@keyframes cloudDrift { 0% { transform: translateX(-350px); } 100% { transform: translateX(500px); } }' +
            '@keyframes flashLightning { 0%, 92%, 98% { background: rgba(255,255,255,0); } 94%, 99% { background: rgba(255,255,255,0.8); } 100% { background: rgba(255,255,255,0); } }' +
            '@keyframes sunPulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }' +
            '@keyframes fogDrift { 0% { transform: translateX(-10%); opacity: 0.3;} 50% { transform: translateX(5%); opacity: 0.6;} 100% { transform: translateX(-10%); opacity: 0.3;} }' +
            '.p-rain { position: absolute; background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.8)); border-radius: 5px; }' +
            '.p-snow { position: absolute; background: #fff; border-radius: 50%; box-shadow: 0 0 6px rgba(255,255,255,0.8); }' +
            '.p-leaf { position: absolute; width: 18px; height: 18px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }' +
            '.p-cloud { position: absolute; background-repeat: no-repeat; background-size: contain; filter: drop-shadow(0 8px 15px rgba(0,0,0,0.15)); }' +
            '.btn-spinner { border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spinAnim 0.7s linear infinite; }' +
            '@keyframes spinAnim { to { transform: rotate(360deg); } }' +
            '</style>';

        function generateAppShell() {
            return `
            <div id="weather-app" style="position:absolute;inset:0;background:#111;display:flex;flex-direction:column;font-family:-apple-system,'SF Pro Text',sans-serif;color:#fff;overflow:hidden;z-index:400">
                <div id="weather-content" style="flex:1;position:relative;width:100%;height:100%;overflow:hidden;">
                    </div>
            </div>
            `;
        }

        function renderWeatherUI(iframeDoc) {
            const container = iframeDoc.getElementById('weather-content');
            if (!container) return;

            var ws = WeatherSystem;
            var data = ws.data;
            var glassStyle = 'background: rgba(0, 0, 0, 0.2); border-radius: 20px; padding: 16px; margin: 0 16px 16px 16px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 8px 25px rgba(0,0,0,0.15);';
            var textShadow = 'text-shadow: 0 1px 3px rgba(0,0,0,0.4);';

            var buildHeader = function(disableRefresh) {
                return '<div style="display:flex;align-items:center;padding:12px 16px; ' + textShadow + '; position: relative; z-index: 10;">'
                    + '<div id="weather-back-btn" style="cursor:pointer;display:flex;align-items:center;gap:4px;font-size:15px;opacity:1;">'
                    + '<img src="https://api.iconify.design/ri:arrow-left-s-line.svg?color=white" style="width:24px;height:24px;">'
                    + '<span>Trở về</span></div>'
                    + '<div style="flex:1;text-align:center;font-size:17px;font-weight:600;">Thời tiết</div>'
                    + '<div style="width:60px; display:flex; justify-content:flex-end;">'
                    + (disableRefresh ? '' : '<div id="weather-refresh-btn" style="cursor:pointer; padding:6px; border-radius:50%; background:rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; backdrop-filter: blur(5px);"><img src="https://api.iconify.design/mdi:refresh.svg?color=white" style="width:20px;height:20px;"></div>')
                    + '</div></div>';
            };

            // ĐÃ SỬA CHỮA: Cập nhật inline style để ép tràn nội dung bị cắt bỏ, chặn đứng cuộn ngang
            if (ws.isLoading) {
                var emptyBg = getStaticBackground('sunny', 'day');
                container.innerHTML = '<div style="width:100%; height:100%; background:' + emptyBg + '; transition: background 1.5s ease; position:relative; overflow:hidden;">'
                    + '<div class="weather-dynamic-layer" style="position: absolute; inset: 0; pointer-events: none; overflow:hidden;">' + generateDynamicLayer('sunny', 'day', 'spring') + '</div>'
                    + '<div class="weather-ui-layer" style="position: absolute; inset: 0; z-index: 2; padding-top: 44px; overflow-y:auto; overflow-x:hidden;">'
                    + buildHeader(true)
                    + '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center; height:70%;">'
                    + '<div class="btn-spinner" style="width:40px; height:40px; margin-bottom:15px;"></div>'
                    + '<div style="font-size:18px;font-weight:600;margin-bottom:12px; ' + textShadow + '">Đang phân tích bối cảnh...</div>'
                    + '<div style="font-size:14px;opacity:0.9; ' + textShadow + '">AI đang đọc dữ liệu chat để tạo thời tiết.</div>'
                    + '</div></div></div>';
                
                iframeDoc.getElementById('weather-back-btn').onclick = () => window.parent.PhoneSystem.goHome();
                return;
            }

            if (!data || !data.forecast || data.forecast.length === 0) {
                var emptyBg = getStaticBackground('cloudy', 'day');
                container.innerHTML = '<div style="width:100%; height:100%; background:' + emptyBg + '; transition: background 1.5s ease; position:relative; overflow:hidden;">'
                    + '<div class="weather-ui-layer" style="position: absolute; inset: 0; z-index: 2; padding-top: 44px; overflow-y:auto; overflow-x:hidden;">'
                    + buildHeader(false)
                    + '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center; height:70%;">'
                    + '<div style="font-size:64px;margin-bottom:20px;opacity:0.8; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">🌤️</div>'
                    + '<div style="font-size:18px;font-weight:600;margin-bottom:12px; ' + textShadow + '">Chưa có dữ liệu thời tiết</div>'
                    + '<div style="font-size:14px;opacity:0.9;line-height:1.6; ' + textShadow + '">Nhấp vào biểu tượng làm mới ở góc trên bên phải để tạo thời tiết cho câu chuyện.</div>'
                    + '</div></div></div>';
                
                iframeDoc.getElementById('weather-back-btn').onclick = () => window.parent.PhoneSystem.goHome();
                iframeDoc.getElementById('weather-refresh-btn').onclick = () => ws.updateWeatherForecast(iframeDoc);
                return;
            }

            var currentWeather = data.current;
            var forecast = data.forecast;
            var season = data.season;
            var seasonName = SEASONS[season] ? SEASONS[season].name : 'Mùa xuân';

            var currentHour = ws.getCurrentGameHour();
            var sunTimes = { spring: { rise: '06:00', set: '18:00' }, summer: { rise: '05:30', set: '18:30' }, autumn: { rise: '06:00', set: '17:30' }, winter: { rise: '06:45', set: '17:15' } };
            var sun = sunTimes[season] || sunTimes.spring;
            var riseHour = parseInt(sun.rise.split(':')[0]);
            var setHour = parseInt(sun.set.split(':')[0]);

            var timeState = 'day';
            if (currentHour < riseHour - 1 || currentHour > setHour) timeState = 'night';
            else if (currentHour === riseHour - 1 || currentHour === riseHour) timeState = 'dawn';
            else if (currentHour === setHour - 1 || currentHour === setHour) timeState = 'dusk';

            var hourlyData = [];
            for (var i = 0; i < 24; i++) {
                var h = (currentHour + i) % 24;
                var isNextDay = (currentHour + i) >= 24;
                var dayIndex = isNextDay ? 1 : 0;
                var fDay = forecast[dayIndex];
                if (!fDay || !fDay.hourly) continue;

                var prevEven = Math.floor(h / 2) * 2;
                var nextEven = (prevEven + 2) % 24;
                var nextDayIndex = (prevEven + 2 >= 24 && !isNextDay) ? 1 : (prevEven + 2 >= 24 && isNextDay ? 2 : dayIndex);
                var prevData, nextData;
                for(var j=0; j<fDay.hourly.length; j++) if (parseInt(fDay.hourly[j].time) === prevEven) prevData = fDay.hourly[j];
                var nDay = forecast[nextDayIndex];
                if (nDay && nDay.hourly) for(var j=0; j<nDay.hourly.length; j++) if (parseInt(nDay.hourly[j].time) === nextEven) nextData = nDay.hourly[j];

                if (prevData) {
                    var hrTemp = prevData.temp;
                    if (h % 2 !== 0 && nextData) hrTemp = Math.round((prevData.temp + nextData.temp) / 2);
                    hourlyData.push({ type: 'weather', time: String(h).padStart(2, '0') + ':00', weather: prevData.weather, icon: prevData.icon, temp: hrTemp, isCurrent: i === 0, isNextDay: isNextDay, dayLabel: isNextDay ? 'Ngày mai' : '', showDayLabel: isNextDay && h === 0, absoluteVal: (currentHour + i) });
                }
            }
            var sunEvents = [{ time: sun.rise, type: 'sun', icon: 'mdi:weather-sunset-up', label: 'Bình minh', isNextDay: false }, { time: sun.set, type: 'sun', icon: 'mdi:weather-sunset-down', label: 'Hoàng hôn', isNextDay: false }, { time: sun.rise, type: 'sun', icon: 'mdi:weather-sunset-up', label: 'Bình minh', isNextDay: true }, { time: sun.set, type: 'sun', icon: 'mdi:weather-sunset-down', label: 'Hoàng hôn', isNextDay: true }];
            sunEvents.forEach(function(ev) {
                var evHr = parseInt(ev.time.split(':')[0]) + (ev.time.split(':')[1] === '30' ? 0.5 : (ev.time.split(':')[1] === '45' ? 0.75 : 0));
                var evAbs = evHr + (ev.isNextDay ? 24 : 0);
                if (evAbs > currentHour && evAbs < currentHour + 24) { ev.absoluteVal = evAbs; hourlyData.push(ev); }
            });
            hourlyData.sort(function(a, b) { return a.absoluteVal - b.absoluteVal; });

            var backgroundGradient = getStaticBackground(currentWeather.weather, timeState);
            var html = '<div style="width:100%; height:100%; background:' + backgroundGradient + '; transition: background 1.5s ease; position:relative; overflow:hidden;">';
            html += '<div class="weather-dynamic-layer" style="position: absolute; inset: 0; pointer-events: none; overflow: hidden;">' + generateDynamicLayer(currentWeather.weather, timeState, season) + '</div>';
            
            // ĐÃ SỬA CHỮA: Thêm overflow-x: hidden; vào thẻ này
            html += '<div class="weather-ui-layer" style="position: absolute; inset: 0; z-index: 2; overflow-y: auto; overflow-x: hidden; padding-top: 44px; padding-bottom: 30px;">';
            
            html += buildHeader(false);

            html += '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 20px 30px 20px; ' + textShadow + '">'
                + '<div style="font-size: 32px; font-weight: 500; margin-bottom: 5px;">' + seasonName + '</div>'
                + '<div style="font-size: 80px; font-weight: 200; line-height: 1; margin: 5px 0 10px 0;">' + currentWeather.temperature + '°</div>'
                + '<div style="font-size: 20px; font-weight: 500; opacity: 0.95; margin-bottom: 5px;">' + currentWeather.weatherName + '</div>'
                + '<div style="display: flex; gap: 12px; font-size: 16px; font-weight: 500; opacity: 0.9;"><span>C: ' + currentWeather.tempHigh + '°</span><span>T: ' + currentWeather.tempLow + '°</span></div></div>';

            if (hourlyData.length > 0) {
                html += '<div style="' + glassStyle + '"><div style="display: flex; align-items: center; gap: 8px; font-size: 13px; opacity: 0.8; margin-bottom: 12px; font-weight: 600; text-transform: uppercase;">' + iconSvg('mdi:clock-outline', 16) + ' Dự báo hàng giờ</div>'
                    + '<div style="height: 1px; background: rgba(255,255,255,0.15); margin-bottom: 12px;"></div><div class="hourly-scroll-container" style="display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; cursor: grab; user-select: none; -webkit-overflow-scrolling: touch;">';
                for (var k = 0; k < hourlyData.length; k++) {
                    var hd = hourlyData[k];
                    html += '<div style="display: flex; flex-direction: column; align-items: center; min-width: 50px; position: relative;">';
                    if (hd.showDayLabel) html += '<div style="position: absolute; top: -15px; font-size: 10px; color: #ffeb3b; font-weight: 600; white-space: nowrap;">' + hd.dayLabel + '</div>';
                    if (hd.type === 'sun') {
                        html += '<div style="font-size: 13px; margin-bottom: 10px; font-weight: 600; opacity: 0.9; ' + textShadow + '">' + hd.time + '</div><div style="margin-bottom: 10px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">' + iconSvg(hd.icon, 28, '%23FFD700') + '</div><div style="font-size: 12px; font-weight: 600; color: #FFD700; ' + textShadow + '">' + hd.label + '</div>';
                    } else {
                        var timeLabel = hd.isCurrent ? 'Bây giờ' : parseInt(hd.time.split(':')[0]) + 'h';
                        var fontWeight = hd.isCurrent ? '700' : '500';
                        html += '<div style="font-size: 14px; margin-bottom: 10px; white-space: nowrap; font-weight:' + fontWeight + '; ' + textShadow + '">' + timeLabel + '</div><div style="margin-bottom: 10px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">' + weatherSvg(hd.weather, 28) + '</div><div style="font-size: 16px; font-weight:' + fontWeight + '; ' + textShadow + '">' + hd.temp + '°</div>';
                    }
                    html += '</div>';
                }
                html += '</div></div>';
            }

            var fullDaysMap = { 'CN': 'Chủ nhật', 'T2': 'Thứ Hai', 'T3': 'Thứ Ba', 'T4': 'Thứ Tư', 'T5': 'Thứ Năm', 'T6': 'Thứ Sáu', 'T7': 'Thứ Bảy' };
            html += '<div style="' + glassStyle + '"><div style="display: flex; align-items: center; gap: 8px; font-size: 13px; opacity: 0.8; margin-bottom: 12px; font-weight: 600; text-transform: uppercase;">' + iconSvg('mdi:calendar-week', 16) + ' Dự báo 7 ngày</div>'
                + '<div style="height: 1px; background: rgba(255,255,255,0.15); margin-bottom: 8px;"></div><div style="display: flex; flex-direction: column;">';

            var weekMin = 100, weekMax = -100;
            for (var m = 0; m < forecast.length; m++) {
                if (forecast[m].tempLow < weekMin) weekMin = forecast[m].tempLow;
                if (forecast[m].tempHigh > weekMax) weekMax = forecast[m].tempHigh;
            }
            var tempRange = weekMax - weekMin || 1;

            for (var n = 0; n < forecast.length; n++) {
                var day = forecast[n]; var isToday = n === 0;
                var dayLabel = isToday ? 'Hôm nay' : fullDaysMap[day.weekday] || day.weekday;
                html += '<div style="display: grid; grid-template-columns: 85px 65px 30px 1fr 30px; align-items: center; gap: 6px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">'
                    + '<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;"><div style="font-size: 15px; font-weight: ' + (isToday ? '700' : '500') + '; ' + textShadow + '">' + dayLabel + '</div><div style="font-size: 12px; opacity: 0.6;">' + day.date.split('-').reverse().join('/') + '</div></div>'
                    + '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;"><div style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));">' + weatherSvg(day.weather, 24) + '</div><div style="font-size: 10px; font-weight: 500; opacity: 0.9; white-space: nowrap; text-align: center;">' + day.weatherName + '</div></div>'
                    + '<div style="font-size: 15px; font-weight: 600; opacity: 0.7; text-align: right; ' + textShadow + '">' + day.tempLow + '°</div>';

                var leftPercent = ((day.tempLow - weekMin) / tempRange) * 100;
                var widthPercent = Math.max(((day.tempHigh - day.tempLow) / tempRange) * 100, 10);

                html += '<div style="height: 6px; background: rgba(0,0,0,0.4); border-radius: 4px; position: relative; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);">'
                    + '<div style="position: absolute; top: 0; height: 100%; background: linear-gradient(90deg, #56CCF2 0%, #FFB75E 100%); border-radius: 4px; left: ' + leftPercent + '%; width: ' + widthPercent + '%;"></div>';
                if (isToday) {
                    var currentPct = ((currentWeather.temperature - weekMin) / tempRange) * 100;
                    html += '<div style="position: absolute; top: 0; width: 4px; height: 100%; background: white; border-radius: 2px; left: ' + currentPct + '%; box-shadow: 0 0 4px rgba(0,0,0,0.5); z-index: 2;"></div>';
                }
                html += '</div><div style="font-size: 15px; font-weight: 600; text-align: right; ' + textShadow + '">' + day.tempHigh + '°</div></div>';
            }

            html += '</div></div></div></div>';
            container.innerHTML = html;

            iframeDoc.getElementById('weather-back-btn').onclick = () => window.parent.PhoneSystem.goHome();
            iframeDoc.getElementById('weather-refresh-btn').onclick = () => ws.updateWeatherForecast(iframeDoc);

            var scrollContainer = iframeDoc.querySelector('.hourly-scroll-container');
            if (scrollContainer) {
                var isDown = false, startX, scrollLeft;
                scrollContainer.addEventListener('mousedown', function(e) { isDown = true; scrollContainer.style.cursor = 'grabbing'; startX = e.pageX - scrollContainer.offsetLeft; scrollLeft = scrollContainer.scrollLeft; });
                scrollContainer.addEventListener('mouseleave', function() { isDown = false; scrollContainer.style.cursor = 'grab'; });
                scrollContainer.addEventListener('mouseup', function() { isDown = false; scrollContainer.style.cursor = 'grab'; });
                scrollContainer.addEventListener('mousemove', function(e) {
                    if (!isDown) return; e.preventDefault();
                    scrollContainer.scrollLeft = scrollLeft - ((e.pageX - scrollContainer.offsetLeft) - startX) * 2;
                });
            }
        }

        // ============ Phần 4: Vòng Đời APP (Open/Close) ============

        function openApp() {
            const phoneSystem = window.parent.PhoneSystem;
            if (!phoneSystem || !phoneSystem.iframeWindow) return;

            const iframeDoc = phoneSystem.iframeWindow.document;

            WeatherSystem.ensureCurrentChatWeather();

            if (!iframeDoc.getElementById('weather-app-styles')) {
                const styleEl = iframeDoc.createElement('div');
                styleEl.innerHTML = cssRules;
                iframeDoc.head.appendChild(styleEl.firstElementChild);
            }

            const homeScreen = iframeDoc.getElementById('home-screen');
            if (homeScreen) homeScreen.style.display = 'none';

            let appContainer = iframeDoc.getElementById('app-container');
            if (!appContainer) {
                const screen = iframeDoc.querySelector('.screen');
                if (screen) {
                    appContainer = iframeDoc.createElement('div');
                    appContainer.id = 'app-container';
                    appContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:300;pointer-events:none;overflow:hidden;';
                    screen.appendChild(appContainer);
                }
            }

            appContainer.innerHTML = generateAppShell();
            appContainer.style.pointerEvents = 'auto';

            renderWeatherUI(iframeDoc);

            const statusBar = iframeDoc.getElementById('status-bar');
            if (statusBar) {
                statusBar.classList.remove('light');
                statusBar.classList.add('dark');
            }
        }

        function closeApp() {
            const phoneSystem = window.parent.PhoneSystem;
            if (!phoneSystem?.iframeWindow) return;

            try {
                const iframeDoc = phoneSystem.iframeWindow.document;
                const appContainer = iframeDoc.getElementById('app-container');
                if (appContainer) {
                    appContainer.innerHTML = '';
                    appContainer.style.pointerEvents = 'none';
                }

                const homeScreen = iframeDoc.getElementById('home-screen');
                if (homeScreen) homeScreen.style.display = 'block';

                const statusBar = iframeDoc.getElementById('status-bar');
                if (statusBar) {
                    statusBar.classList.remove('dark');
                    statusBar.classList.add('light');
                }
            } catch (e) {
                console.error('[APP Thời tiết] Lỗi khi đóng ứng dụng:', e);
            }
        }

        // ============ Đăng ký APP vào hệ thống ============

        window.parent.PhoneSystem.registerApp({
            id: APP_ID,
            name: APP_NAME,
            icon: APP_ICON,
            color: APP_COLOR,
            order: 2
        });

        window.parent.PhoneSystem.on('app-opened', function (data) {
            if (data.id === APP_ID) openApp();
        });

        window.parent.PhoneSystem.on('go-home', function () {
            closeApp();
        });

        console.log('[APP Thời tiết] Module đã được tải hoàn tất!');
    });
})();