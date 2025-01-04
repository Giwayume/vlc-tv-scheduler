
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

/** Parses a cron field into type and range/values */
function parseCron(cron) {
    const parts = cron.split(' ');
    if (parts.length !== 5) {
        throw new Error('Invalid cron string. Must have 5 parts.');
    }

    const parseField = part => {
        if (part === '*') return { type: 'wildcard' };
        if (part.includes('/')) {
            const [range, step] = part.split('/');
            return { type: 'step', range: range === '*' ? null : range.split('-').map(Number), step: parseInt(step, 10) };
        }
        if (part.includes('-')) {
            return { type: 'range', range: part.split('-').map(Number) };
        }
        return { type: 'list', values: part.split(',').map(Number) };
    };

    return {
        minute: parseField(parts[0]),
        hour: parseField(parts[1]),
        dayOfMonth: parseField(parts[2]),
        month: parseField(parts[3]),
        dayOfWeek: parseField(parts[4]),
    };
}

/** Check if an individual field in a cronjob matches */
function matchField(value, field) {
    if (field.type === 'wildcard') return true;
    if (field.type === 'list') return field.values.includes(value);
    if (field.type === 'range') return value >= field.range[0] && value <= field.range[1];
    if (field.type === 'step') {
        const start = field.range ? field.range[0] : 0;
        return (value - start) % field.step === 0;
    }
    return false;
}

/** Give a cron string and starting date, finds the next time that the cron will run */
function getNextMatchingTime(cron, fromDate = new Date()) {
    const fields = parseCron(cron);
    const maxValues = { minute: 59, hour: 23, dayOfMonth: 31, month: 12, dayOfWeek: 6 };

    const nextDate = new Date(fromDate);
    nextDate.setSeconds(0);
    nextDate.setMilliseconds(0);

    while (true) {
        if (!matchField(nextDate.getMinutes(), fields.minute, maxValues.minute)) {
            nextDate.setMinutes(nextDate.getMinutes() + 1);
            nextDate.setSeconds(0);
            continue;
        }

        if (!matchField(nextDate.getHours(), fields.hour, maxValues.hour)) {
            nextDate.setMinutes(0);
            nextDate.setHours(nextDate.getHours() + 1);
            continue;
        }

        if (!matchField(nextDate.getDate(), fields.dayOfMonth, maxValues.dayOfMonth)) {
            nextDate.setHours(0);
            nextDate.setDate(nextDate.getDate() + 1);
            continue;
        }

        if (!matchField(nextDate.getMonth() + 1, fields.month, maxValues.month)) {
            nextDate.setDate(1);
            nextDate.setMonth(nextDate.getMonth() + 1);
            continue;
        }

        if (!matchField(nextDate.getDay(), fields.dayOfWeek, maxValues.dayOfWeek)) {
            nextDate.setDate(nextDate.getDate() + 1);
            continue;
        }

        return nextDate;
    }
}

module.exports = {
    cronMatchesTimestamp,
    getNextMatchingTime,
};
