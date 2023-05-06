import { useCallback, useEffect, useState } from "react";
import "./App.css";
import axios from "axios";
import moment from "moment";

const INDEX_TO_DIRECTION_MAP = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
  "N",
];

function App() {
  const [data, setData] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [orderIdForAI, setOrderIdForAI] = useState(null);
  const [location, setLocation] = useState({
    lat: "49.2827",
    lon: "-123.1207",
  });
  const [currentMoment] = useState(moment());
  // in the future can make it so only getting weather date after user provided their location instead of making several calls
  const getWeatherCast = useCallback(async () => {
    try {
      const res = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${process.env.REACT_APP_WEATHER_API}&units=metric`
      );
      setData(res.data);
    } catch (err) {
      console.error("Error ocurred when trying to retrieve weather details");
    }
  }, [location]);

  const generateAIImage = (weatherState, city) => {
    const month = moment().format("MMMM");
    if (!weatherState) {
      console.error("No weather state provided, likely the weather API failed");
      return;
    }
    let prompt = `${weatherState} in ${city} in ${month} weather`;

    axios
      .post(
        `https://api.neural.love/v1/ai-art/generate`,
        {
          prompt,
          style: "nature",
          layout: "square",
          amount: 1,
          isHd: false,
          isPublic: true,
        },
        {
          headers: {
            Authorization: process.env.REACT_APP_AI_IMG_GENERATOR_API,
          },
        }
      )
      .then((res) => {
        console.log("response from post: ", res);
        setOrderIdForAI(res.data.orderId);
      })
      .catch((err) => {
        // TODO: handle different cases
        // View https://docs.neural.love/reference/ai-art-generate for details
        console.error("Error ocurred when trying to generate AI");
      });
  };

  const getWindDir = (deg) => {
    if (!deg) return "N/A";
    const tempVal = (deg % 360) / 22.5 + 1;
    const index = Math.round(tempVal);
    return INDEX_TO_DIRECTION_MAP[index];
  };

  useEffect(() => {
    getWeatherCast();
  }, [getWeatherCast]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      setLocation({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      });
    });
  }, []);

  useEffect(() => {
    let timerToCheckImg;
    if (orderIdForAI && !generatedImage) {
      timerToCheckImg = setInterval(() => {
        axios
          .get(`https://api.neural.love/v1/ai-art/orders/${orderIdForAI}`, {
            headers: {
              Authorization: process.env.REACT_APP_AI_IMG_GENERATOR_API,
            },
          })
          .then((res) => {
            console.log("res: ", res);
            setGeneratedImage(res.data.output[0].full);
            clearInterval(timerToCheckImg);
          })
          .catch((err) => {
            // TODO: handle different cases
            // View https://docs.neural.love/reference/ai-art-get-order for details
            console.error(
              "Error ocurred when retrieving generated image: ",
              err
            );
          });
      }, 30000);
    }
    return () => clearInterval(timerToCheckImg);
  }, [orderIdForAI, generatedImage]);
  // console.log("data: ", data);

  return (
    <div className="App px-2">
      <div className="flex flex-col p-4 gap-4">
        <div className="flex-1 flex flex-col gap-1 items-start">
          <div className="text-sky-600 font-bold">
            {currentMoment.format("MMM DD, HH:mm")}
          </div>
          <div className="text-3xl font-extrabold">
            {data?.name}, {data?.sys.country}
          </div>
          <div className="flex flex-row text-5xl items-center">
            <img
              src="https://openweathermap.org/img/wn/10d@2x.png"
              alt="icon"
            />
            <div>
              {Math.round(data?.main.temp)}
              ºC
            </div>
          </div>
          <div className="font-bold text-md">
            Feels like {data?.main.feels_like} |{" "}
            {data?.weather.map((w) => w.description).join(" | ")}
          </div>
          <div className="px-4 text-left border-l-2 border-sky-600 grid grid-cols-2 gap-x-4">
            <div>
              <span>{data?.wind.speed.toFixed(1)}</span>
              <span>m/s </span>
              <span>{getWindDir(data?.wind.deg)}</span>
            </div>
            <div>{data?.main.pressure}hPa</div>
            <div>Humidity: {data?.main.humidity}%</div>
            <div>Visibility: {(data?.visibility / 1000).toFixed(1)}km</div>
          </div>
        </div>
        {generatedImage && (
          <img className="rounded-lg" alt="ai img" src={generatedImage} />
        )}
        <button
          className="p-2 bg-sky-600 rounded-3xl text-white"
          onClick={() =>
            generateAIImage(data?.weather[0].description, data?.name)
          }
          disabled={orderIdForAI && !generatedImage}
        >
          {orderIdForAI && !generatedImage
            ? "Generating Image"
            : "Generate AI image based on weather"}
        </button>
        {/* <div className="border-2 flex-1">Can integrate a google map later</div> */}
      </div>
    </div>
  );
}

export default App;
