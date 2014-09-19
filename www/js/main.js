require(
  [
    "jquery",
    "hbs!./templates/index_template",
    "hbs!./templates/login_template",
    "bacon",
    "lodash",
    "flot",
    "flot-resize"
  ],
  function($, indexT, loginT) {

    var rawData = []
    var includedIndexByStartDay = []
    var includedIndexByPace = []
    var excludedIndexByStartDay = []
    var excludedIndexByPace = []

    doPlot()

    var restHR = 50
    inputValue($('#rest_hr')).debounce(500).onValue(function(val) {
      restHR = val
      reCalculateData()
    })


    var maxPace = 6.25
    inputValue($('#slowest')).debounce(500).onValue(function(val) {
      maxPace = val
      reCalculateData()
    })

    var minHR = 100
    inputValue($('#hr_min')).debounce(500).onValue(function(val) {
      minHR = val
      reCalculateData()
    })

    var maxHR = 100
    inputValue($('#hr_max')).debounce(500).onValue(function(val) {
      maxHR = val
      reCalculateData()
    })

    var userE = getJsonE('/rest/user')

    userE.onValue(function() {
      var dataE = Bacon.fromArray([1,2,3,4,5,6,7,8,9,10])
        .flatMap(function(page) {
          return Bacon.retry({
            source: function() { return getJsonE('/rest/runs/' + page) },
            retries: 5
          })
        })
        .flatMap(function(runs) {
          return Bacon.fromArray(runs)
        })
        .flatMap(function(run_id) {
          return Bacon.retry({
            source: function() { return getJsonE('/rest/laps/' + run_id) },
            retries: 5
          })
        })
        .flatMap(function(laps) {
          return Bacon.fromArray(laps)
        })

      dataE
        .onValue(function(lap) {
          rawData.push(lap)
        })

      dataE.throttle(250).onValue(function() {
        reCalculateData()
      })

      dataE.take(1).onValue(function() {
        $('#header').html('<h4>Etenem&auml; v0.1</h4>')
      })

      dataE.onError(function(e) {
        $('#header').html('<h4>Etenem&auml; v0.1 - virhe, pahoittelut! Yrit&auml; my&ouml;hemmin uudelleen</h4>')
        console.log('error: ' + JSON.stringify(e))
      })
    })

    userE.onError(function(e) {
      $('#header').html('<h4>Etenem&auml; v0.1 - kirjaudu sis&auml;&auml;n</h4>')
      $('#login').empty().append(loginT())
    })

    function reCalculateData() {
      lapsInRange = _.filter(rawData, lapDataInRanges)
      lapsOutOfRange = _.filter(rawData, lapDataNotInRanges)

      includedIndexByStartDay = _.map(lapsInRange, calcIndexByStartDay)
      includedIndexByPace = _.map(lapsInRange, calcIndexByPacePair)

      excludedIndexByStartDay = _.map(lapsOutOfRange, calcIndexByStartDay)
      excludedIndexByPace = _.map(lapsOutOfRange, calcIndexByPacePair)

      doPlot()

      function calcIndexByPacePair(lap) {
        return [pace(lap), lap.distance / (lap.elapsed_time * (lap.average_heartrate - restHR))]
      }

      function calcIndexByStartDay(lap) {
        return [lap.start_time, lap.distance / (lap.elapsed_time * (lap.average_heartrate - restHR))]
      }

      function lapDataInRanges(lap) {
          return pace(lap) <= maxPace && lap.average_heartrate >= minHR && lap.average_heartrate <= maxHR
      }

      function lapDataNotInRanges(lap) {
        return !lapDataInRanges(lap)
      }

      function pace(lap) {
        return lap.distance > 0.0 ? (lap.elapsed_time / lap.distance) * 1000 : 0
      }
    }

    function inputValue($input) {
      function value() { return $input.val() }
      return $input.asEventStream("input change").map(value).toProperty(value())
    }

    function getJsonE(url) {
      return Bacon.fromPromise($.ajax({url: url, dataType: 'json', timeout: 10000}))
    }

    function doPlot() {
      function cross(ctx, x, y, radius, shadow) {
        var size = radius * Math.sqrt(Math.PI) / 2;
        ctx.moveTo(x - size, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x - size, y + size);
        ctx.lineTo(x + size, y - size);
      }

      function doPlotHistory() {
        $.plot($("#historyplot"),
               [
                 {color: "rgb(200, 200, 200)", data: excludedIndexByStartDay},
                 {color: "rgb(255, 000, 000)", data: includedIndexByStartDay}
               ],
               {
                 yaxis: {
                   max: 5,
                   min: 0
                 },
                 xaxis: {
                   minTickSize: 1
                 },
                 series: {
                   points: {
                     show: true,
                     symbol: cross
                   }
                 }
               })
      }

      function doPlotPaceVsIndex() {
        $.plot($('#pacevsindexplot'),
               [
                 {color: "rgb(200, 200, 200)", data: excludedIndexByPace},
                 {color: "rgb(255, 000, 000)", data: includedIndexByPace}
               ],
               {
                 yaxis: {
                   max: 5,
                   min: 0
                 },
                 xaxis: {
                   min: 1.75,
                   max: maxPace,
                   minTickSize: 0.25
                 },
                 series: {
                   points: {
                     show: true,
                     symbol: cross
                   }
                 }
               })
      }
      doPlotPaceVsIndex()
      doPlotHistory()
    }

  }
)
