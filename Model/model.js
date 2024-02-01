const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const jwtSecretKey = crypto.randomBytes(32).toString('hex');


//                      For Indian Time 

function convertUTCDateToIST(date) {
  const istOffset = 330; 
  return new Date(date.getTime() + istOffset * 60000);
}
const utcDate = new Date();
const istDate = convertUTCDateToIST(utcDate);


//                           For Authenticaton 

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, jwtSecretKey);
    const user = await User.findOne({ _id: decoded._id, 'tokens.token': token });

    if (!user) {
      throw new Error();
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

//                            For Banner Schema 

const bannerSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: String,
  image: String,
});

const Banner = mongoose.model('Banner', bannerSchema);

//                            For Second Banner Schema 

const banner1Schema = new mongoose.Schema({
  title: String,
  description: String,
  price: String,
  image: String,
});

const Banner1 = mongoose.model('Banner1', banner1Schema);

//                               For Order Schema

const orderSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number,
});

//                               For User Schema

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  cpassword: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  createdAt: {
    type: Date,
    default: istDate,
  },
  imageUrl:{
    type: String,
  },
  addresses: [{
    name:{
      type: String,
 
    },
    mobileNo: {
      type: String,
  
    },
    houseNo: {
      type: String,
   
    },
    street:{
      type: String,
   
    },
    landmark:{
      type: String,
   
    },
    postalCode: {
      type: String,
   
    },
    city: {
      type: String,
    
    },
    state: {
      type: String,
  
    },
    country: {
      type: String,
   
    },
  }],
  orders: [orderSchema],
});
const User = mongoose.model('User', userSchema);

//                               For Product Schema

const productSchema = new mongoose.Schema({
  title: String,
  description: String,
  imageUrl: String,
  originalPrice: Number,
  discountedPrice: Number,
});
const Product = mongoose.model('Product', productSchema);

module.exports = { User, Product, Banner , Banner1, authMiddleware   };