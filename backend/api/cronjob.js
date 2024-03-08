
function numericRangeMatch(rangeString, number) {
    const ranges = rangeString.split(',');
    number = parseInt(number);
    for (range of ranges) {
        const rangeSplit = range.split('-');
        const rangeStart = parseInt(rangeSplit[0]);
        const rangeEnd = parseInt(rangeSplit[1] ?? rangeSplit[0]);
        if (number >= rangeStart && number <= rangeEnd) {
            return true;
        }
    }
    return false;
}

/** Returns true if the specified timestamp could fall in the time ranges determined by the cronjob */
function cronMatchesTimestamp(cronjob, timestamp) {
    const cronjobSplit = cronjob.split(/\s+/);
    if (cronjobSplit.length !== 5) return false;

    const [minute, hour, date, month, weekday] = cronjobSplit;

    timestamp = new Date(timestamp);

    if (minute !== '*') {
        const tMinute = timestamp.getMinutes();
        if (!numericRangeMatch(minute, tMinute)) return false;
    }
    if (hour !== '*') {
        const tHour = timestamp.getHours();
        if (!numericRangeMatch(hour, tHour)) return false;
    }
    if (date !== '*') {
        const tDate = timestamp.getDate();
        if (!numericRangeMatch(date, tDate)) return false;
    }
    if (month !== '*') {
        const tMonth = timestamp.getMonth() + 1;
        if (!numericRangeMatch(month, tMonth)) return false;
    }
    if (weekday !== '*') {
        const tWeekday = timestamp.getDay();
        if (!numericRangeMatch(weekday, tWeekday)) return false;
    }
    return true;
}

module.exports = {
    cronMatchesTimestamp,
};
