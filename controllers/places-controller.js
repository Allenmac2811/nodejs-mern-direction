const HttpError = require("../Models/http-error");
const geoCoordinatesForAddress = require("../util/location");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const fs = require("fs");

const Place = require("../Models/place");
const User = require("../Models/user");

const getPlaceById = async (req, res, next) => {
  console.log("Get by PlaceID");
  const placeID = req.params.pid;
  let foundPlace;
  try {
    foundPlace = await Place.findById(placeID);
  } catch (error) {
    const err = new HttpError("Something went wrong, Place not found", 500);
    return next(err);
  }
  if (!foundPlace) {
    const error = new HttpError(`Place not found with PID: ${placeID}`, 404);
    return next(error);
  }
  res.json({ place: foundPlace.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate("places");
    // console.log(userWithPlaces);
  } catch (error) {
    // console.log(error);
    const err = new HttpError(
      "Feteching Places failed, please try again later",
      500
    );
    return next(err);
  }
  if (!userWithPlaces || userWithPlaces.length === 0) {
    return next(new HttpError("Could not find places for Creator", 404));
  }
  res.json({
    places: userWithPlaces.places.map((foundP) =>
      foundP.toObject({ getters: true })
    ),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new HttpError("Invalid inputs, please check your Data", 422);
    return next(err);
  }
  const { title, description, address } = req.body;

  let coordinates;
  try {
    data = await geoCoordinatesForAddress(address);
    //console.log(data.results[0].geometry.location);
  } catch (error) {
    return next(error);
  }
  //console.log(coordinates);
  const createdPlace = new Place({
    title,
    description,
    image: req.file.path,
    address: data.results[0].formatted_address,
    location: data.results[0].geometry.location,
    creator: req.userData.userId,
  });

  //find existing use creator exist or not
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (error) {
    const err = new HttpError("Creating place failed, please try again", 500);
    return next(err);
  }
  //check if user exist or not
  if (!user) {
    return next(new HttpError("Could not find user with provided id", 404));
  }

  //Mongoose session which allows multiple transactions and they will roll back if any trnsaction fails
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again ",
      500
    );
    return next(error);
  }
  // DUMMY_PLACES.push(createdPlace); //unshift if you wanna add at first position
  res.status(201).json({ place: createdPlace.toObject({ getters: true }) });
};

const UpdatePlaces = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new HttpError(`Invalid inputs please check`, 422);
    return next(err);
  }
  const { title, description } = req.body;
  const placeId = req.params.pid;

  let placeToUpdate;
  try {
    placeToUpdate = await Place.findById(placeId);
    // console.log(placeToUpdate);
  } catch (error) {
    const err = new HttpError("Something went wrong, Please try again", 500);
    return next(err);
  }

  if (placeToUpdate.creator.toString() !== req.userData.userId) {
    const err = new HttpError("You are not allowd to edit this place", 401);
    return next(err);
  }

  placeToUpdate.title = title;
  placeToUpdate.description = description;

  try {
    await placeToUpdate.save();
  } catch (error) {
    const err = new HttpError("could not save please try again", 500);
    return next(err);
  }
  //to Object to covert mongoose object to javascript object
  res.status(200).json({ place: placeToUpdate.toObject({ getters: true }) });
};

const DeletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let placeToDelete;
  try {
    placeToDelete = await Place.findById(placeId).populate("creator");
  } catch (error) {
    const err = new HttpError(
      "Something went wrong , could not delte place",
      500
    );
    return next(err);
  }
  if (!placeToDelete) {
    const error = new HttpError("Could not find place with place id", 404);
  }
  //console.log(placeToDelete.creator.id);
  if (placeToDelete.creator.id !== req.userData.userId) {
    const err = new HttpError("You are not allowd to delete this place", 401);
    return next(err);
  }

  const imagePath = placeToDelete.image;
  // console.log(placeToDelete.creator.places);
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await placeToDelete.deleteOne({ session: sess });
    await placeToDelete.creator.places.pull(placeId);
    await placeToDelete.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    // console.log(error);
    const err = new HttpError(
      "Something went wrong , could not delte place",
      500
    );
    return next(err);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  res.status(200).json({ mesaage: `Deleted place with ${placeId}` });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.UpdatePlaces = UpdatePlaces;
exports.DeletePlace = DeletePlace;
