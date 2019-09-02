
/**
 * Кэш подробной информации по бондам
 * @private
 * @type {object}
 */
const _cache = {};

/**
 * Сохранить в кэше данные по инструментам за указанную дату
 * @public
 * @param {string} date Дата котировок
 * @param {Array<object>} bonds Список объектов с подробными данными по инструментам
 */
const putToCache = ({date, bonds}) => {
    if (typeof date !== 'string' || date.length === 0) {
        throw new TypeError('Argument "date" must be not empty string');
    }
    if (!Array.isArray(bonds)) {
        throw new TypeError('Argument "bonds" must be an array');
    }
    if (bonds.length !== 0) {
        const branch = _cache[date] || (_cache[date] = {});
        bonds.forEach((bond) => {
            if (bond === null || typeof bond !== 'object' || !('isin' in bond) || !('data' in bond)) {
                throw new TypeError('Item of argument "bonds" must be an object with "isin" and "data" props');
            }
            branch[bond.isin] = {...bond.data};
        });
    }
};

/**
 * Найти в кэше данные по указанным инструментам. Возвращает объект с подробой информацией по найденным иструментам
 * @public
 * @param {string} date Дата котировок
 * @param {Array<string>} isins Список идентификаторов инструментов
 * @return {object}
 */
const findInCache = ({date, isins}) => {
    if (typeof date !== 'string' || date.length === 0) {
        throw new TypeError('Argument "date" must be not empty string');
    }
    if (!Array.isArray(isins)) {
        throw new TypeError('Argument "isins" must be an array');
    }
    const branch = _cache[date];
    return branch !== undefined && isins.length !== 0 ? isins.reduce((result, isin) => {
        if (typeof isin !== 'string' || isin.length === 0) {
            throw new TypeError('Item of argument "isins" must be not empty string');
        }
        const data = branch[isin];
        if (data !== undefined) {
            result[isin] = {...data};
        }
        return result;
    }, {}) : undefined;
};



/**
 * Мок для модуля http
 */
const http = {
    post({url, body}) {
        const marker = '/bonds/';
        const date = url.substring(url.indexOf(marker) + marker.length);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(body.reduce((result, isin) => {
                    result.push({isin, data:{prop:1000*Math.random()}});
                    return result;
                }, []));
            }, 500);
        });
    }
};

/**
 * Получить список объектов с подробными данными по указанным инструментам за указанную дату
 * @param {string} date Дата котировок
 * @param {Array<string>} isins Список идентификаторов инструментов
 * @return {Array<object>}
 */
const getBondsData = async ({date, isins}) => {
    const cached = findInCache({date, isins});
    const hasCached = cached !== undefined;
    const missed = hasCached ? isins.filter((isin) => !(isin in cached)) : isins;
    let next;
    if (missed.length !== 0) {
        next = await http.post({
            url: `/bonds/${date}`,
            body: missed
        });
        putToCache({date, bonds:next});
    }
    const prev = hasCached ? Object.keys(cached).map((isin) => ({isin, data:cached[isin]})) : [];
    return prev.concat(next || []);
};



console.log(`Задача 2: Кэш данных об облигациях
    Дана функция, которая получает из API данные о финансовых показателях облигаций
    за заданную дату по массиву идентификаторов облигаций (ISIN):

    const getBondsData = async ({date, isins}) => {
        const result = await http.post({
            url: \`/bonds/\$\{date\}\`,
            body: isins
        });
        return result;
    };

    Пример вызова функции:
        getBondsData({
            date: '20180120',
            isins: ['XS0971721963', 'RU000A0JU4L3']
        });

    Результат:
        [{
            isin: 'XS0971721963',
            data: {...}
        }, {
            isin: 'RU000A0JU4L3',
            data: {...}
        }]

    Задача
    Изменить код функции, реализовав кэш на стороне клиента.

Решение.`);

/**
 * Показать решение для указанной даты и списка идентификаторов инструментов
 * @param {string} date Дата котировок
 * @param {Array<string>} isins Список идентификаторов инструментов
 */
const showDecision = async (date, isins) => {
    console.log(`\n    Указана дата ${
        date.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3')} и список инструментов: ${isins.join(', ')}`);
    let cached = _cache[date];//Прямой доступ, только для демонстрации решения
    console.log(cached
        ? `    Кэш уже содержит инструменты: ${Object.keys(cached).join(', ')}`
        : '    Кэш не содержит указанных инструментов');
    const bonds = await getBondsData({date, isins});
    cached = _cache[date];//Прямой доступ, только для демонстрации решения
    console.log(`    Запрошенные данные получены, кэш обновлён и теперь содержит на дату ${date} инструменты:`);
    console.log(`\n        ${Object.keys(cached).join(', ')}`);
};

// Вариант 1
showDecision('20180120', ['ABC-0000-123', 'ABC-0000-345', 'ABC-0000-567']).then(() => {

    // Вариант 2
    showDecision('20180120', ['ABC-0000-345', 'XYZ-0000-123', 'XYZ-0000-345']).then(() => {

        // Вариант 3
        showDecision('20180120', ['XYZ-0000-345', 'ABC-0000-567', 'XYZ-0000-567']).then(() =>
            typeof document !== 'undefined' && document.dispatchEvent(new Event('decision-complete')));
    });
});
