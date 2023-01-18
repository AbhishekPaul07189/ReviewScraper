const parser  = require('node-html-parser')
var liveServer = require("live-server");
var express = require('express')
var cors = require('cors')
var app = express()


function randomNumber(min, max) { 
    return Math.random() * (max - min) + min;
} 

const getFlipkart = async(Item)=>{
    let Reviews = []
    let UserReview = {}
    try{
        const superagent = require("superagent").agent()
        let flipkart_url = "https://www.flipkart.com/search?q="+Item
        let response = await superagent.get(flipkart_url)
        let document = parser.parse(response.text)
        let elements = document.querySelectorAll("._1AtVbE.col-12-12")
        let randomProduct = Math.round(randomNumber(3,elements.length))-1
        let Image = elements[randomProduct].querySelectorAll('._396cs4')[0].getAttribute('src')
        let Product = "https://flipkart.com"+ elements[randomProduct].querySelectorAll('a')[0].getAttribute('href')
        let Reviewresponse = await superagent.get(Product)
        let reviewdocs = parser.parse(Reviewresponse.text)
        let Name = reviewdocs.querySelectorAll('.B_NuCI')[0].textContent
        let reviews = reviewdocs.querySelectorAll('._2c2kV-')[1]
        let reviewContents = reviews.querySelectorAll('._16PBlm')
        for(let reviewIndexes=0;reviewIndexes<reviewContents.length;reviewIndexes++)
        {
            UserReview = {}
            let Rating = reviewContents[reviewIndexes].querySelectorAll("._3LWZlK._1BLPMq")[0].textContent[0]+"★"
            let Impression = reviewContents[reviewIndexes].querySelectorAll("._2-N8zT")[0].textContent
            let Review = reviewContents[reviewIndexes].querySelectorAll(".t-ZTKy")[0].textContent
            UserReview['Rating'] = Rating
            UserReview['Impression'] = Impression
            UserReview['Review'] = Review.replace("READ MORE","")
            UserReview['Name']= Name
            UserReview['Product'] = Product
            UserReview['Image'] = Image
            UserReview['Domain']="Flipkart"
            let DuplicateChecker = true
            for(let RR=0;RR<Reviews.length;RR++)
            {
                if(Reviews[RR]['Review']==Review)
                {
                    DuplicateChecker=false
                    break
                }
            }
            if(DuplicateChecker&&UserReview!={})
            {
                Reviews.push(UserReview)
            }
        }
        return Reviews
    }catch(e){
        return []
    }
}


const getAmazon = async(Item)=>{
    let Reviews = []
    const superagent = require("superagent").agent()
    let link =  "https://www.amazon.in/s?k="+Item
    let response =await superagent.get(link)
    let document = parser.parse(response.text)
    let elements = document.querySelectorAll(".sg-col-20-of-24.s-result-item.s-asin.sg-col-0-of-12.sg-col-16-of-20.sg-col.s-widget-spacing-small.sg-col-12-of-16")
    if (elements.length>0){
    let Link =  elements[0].querySelectorAll('a')[0].getAttribute('href')
    if(Link.startsWith("https://www.amazon.in/ap/signin?"))
    {
       return await getAmazon(Item)
    }
    else
    {    
            try{
                let UserReview = {}
                let productIndex = Math.round(randomNumber(1,elements.length))-1
                let Name = elements[productIndex].querySelectorAll(".a-section.a-spacing-none.puis-padding-right-small.s-title-instructions-style")[0].textContent
                if(Name.includes("SponsoredSponsored"))
                {
                    Name = Name.split("Let us know  ")[1]
                }
                Name = Name.split("|")[0]
                let Image = elements[productIndex].querySelectorAll("img")[0].getAttribute('src')
                let Link = "https://amazon.in"+  elements[productIndex].querySelectorAll('a')[0].getAttribute('href')
                let ReviewPage = await superagent.get(Link)
                let ReviewDoc = parser.parse(ReviewPage.text)
                let ReviewsBox = ReviewDoc.querySelectorAll(".a-section.a-spacing-large.reviews-content.filterable-reviews-content.celwidget")[0]
                let ReviewsUser = ReviewsBox.querySelectorAll(".a-expander-collapsed-height.a-row.a-expander-container.a-expander-partial-collapse-container")
                for(let elementIndex=0;elementIndex<ReviewsUser.length;elementIndex++)
                {
                    UserReview = {}
                    let ReviewContent = ReviewsUser[elementIndex].textContent
                    let Impression = ReviewsBox.querySelectorAll(".a-size-base.a-link-normal.review-title.a-color-base.review-title-content.a-text-bold")[elementIndex].textContent.replace("\n","").trim()
                    let Rating = ReviewsBox.querySelectorAll(".a-icon-alt")[elementIndex].textContent.split("out")[0]
                    UserReview['Name']=Name
                    UserReview['Image'] = Image
                    UserReview['Product'] = Link
                    UserReview['Rating'] = Rating[0]+"★"
                    UserReview['Impression'] = Impression
                    UserReview['Review'] = ReviewContent.replace("Read more","").replace("\n","").trim()
                    UserReview['Domain']="Amazon"
                    let DuplicateChecker = true
                    for(let RR=0;RR<Reviews.length;RR++)
                    {
                       if(Reviews[RR]['Review']==UserReview['Review'])
                       {
                            DuplicateChecker=false
                       }
                    }
                    if(DuplicateChecker&&UserReview!={})
                    {
                        Reviews.push(UserReview)
                    }
                }
            }catch(e){
            }       
        }
        return Reviews
    }else{
        return Reviews
    }
}

const Scraper = async(Item)=>{
    let Results = []
    let AmazonResults = await getAmazon(Item)
    let FlipkartResults = await getFlipkart(Item)
    for(let index=0;index<AmazonResults.length;index++)
    {
        Results.push(AmazonResults[index])
    }
    for(let index=0;index<FlipkartResults.length;index++)
    {
        Results.push(FlipkartResults[index])
    }
    return JSON.stringify(Results)
}


var params = {
	port: 18970, // Set the server port. Defaults to 8080.
	host: "0.0.0.0", // Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP.
	open: false, // When false, it won't load your browser by default.
	file: "./index.html", // When set, serve this file (server root relative) for every 404 (useful for single-page applications)
    root:"./",
	wait: 1000, // Waits for all changes, before reloading. Defaults to 0 sec.
	mount: [['/components', './node_modules']], // Mount a directory to a route.
	logLevel: 2 // 0 = errors only, 1 = some, 2 = lots
};
liveServer.start(params);

app.use(function(req, res, next)
 {
    cors()
    res.set('Cache-Control', 'no-store')
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    next();
});

app.get('/search/:product', async (req, res) => {
    product = req.query.product
    res.send(await Scraper(product))
    res.end()
})

app.post('/search/:product', async (req, res) => {
    product = req.query.product
    res.send(await Scraper(product))
    res.end()
})
app.listen(18907,'127.0.0.1')
