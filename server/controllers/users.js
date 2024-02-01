const User = require("../models/userModels");
const FriendRequest = require("../models/requestSchema");

const getUser = async (req, res) => {
  const { userId } = req.body.user;
  const { id } = req.params;
  const user = await User.findById(id ?? userId).populate({
    path: "friends",
    select: "-password",
  });

  if (user) {
    res.status(200).json({ data: user });
  } else {
    res.status(201).json({ message: "users not found" });
  }
};

const updateUser = async (req, res) => {
  const { userId } = req.body.user;
  const { data } = req.body;

  const filteredUser = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== "")
  );
  const updatedUser = await User.findByIdAndUpdate(
    { _id: userId },
    filteredUser
  );

  if (updatedUser) {
    res.status(200).json({ data: updatedUser });
  } else {
    res.status(201).json({ message: "users update fail" });
  }
};

const updateProfilePhoto = async (req, res) => {
  const { userId } = req.body.user;
  const { data } = req.body;
  if (!data) {
    return res.status(201).json({ message: "Provide all Fields" });
  }
  const updatedUser = await User.findByIdAndUpdate(
    { _id: userId },
    {
      profileUrl: data,
    }
  );

  if (updatedUser) {
    res.status(200).json({ data: updatedUser });
  } else {
    res.status(201).json({ message: "users update fail" });
  }
};

const sendfriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.body.user;
    const { requestId } = req.body.data;

    const existRequest = await FriendRequest.findOne({
      requestFrom: userId,
      requestTo: requestId,
    });

    if (existRequest) {
      res.status(201).json({ message: "You Have Alredy Sent Request" });
      return;
    }

    const accountExist = await FriendRequest.findOne({
      requestFrom: requestId,
      requestTo: userId,
    });

    if (accountExist) {
      res.status(201).json({ message: "You Have Alredy Received Request" });
      return;
    }

    const newRequest = await FriendRequest.create({
      requestFrom: userId,
      requestTo: requestId,
    });
    newRequest.save();
    res.status(200).json({ success: true, message: newRequest });
  } catch (error) {
    console.log(error);
  }
};

const getfriendRequest = async (req, res) => {
  const { userId } = req.body.user;
  try {
    const request = await FriendRequest.find({
      requestTo: userId,
      requestStatus: "Pending",
    })
      .populate({
        path: "requestFrom",
        select: "-password",
      })
      .limit(10)
      .sort({ _id: -1 });
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    res.status(201).json({ message: "Not Exist" });
  }
};

const acceptfriendRequest = async (req, res) => {
  const id = req.body.user.userId;
  const { rid, requestStatus } = req.body.data;
  const status = requestStatus;
  const exist = await FriendRequest.findById(rid);
  if (!exist) {
    return res.status(201).json({ message: "No Friend requset found" });
  }
  try {
    const newExist = await FriendRequest.findByIdAndUpdate(
      { _id: rid, requestStatus: status },
      { requestStatus: "Accepted" },
      { new: true }
    );

    if (newExist && newExist.requestStatus === "Accepted") {
      const admin = await User.findById(id);
      const friendId = newExist.requestFrom;

      if (!admin.friends.includes(friendId)) {
        admin.friends.push(friendId);
        await admin.save();
      }

      const friend = await User.findById(friendId);
      if (!friend.friends.includes(id)) {
        friend.friends.push(id);
        await friend.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Success",
    });
  } catch (error) {
    console.error(error);
    res.status(201).json({
      success: false,
      message: "An error occurred",
    });
  }
};

const profileView = async (req, res) => {
  const { userId } = req.body.user;
  const { id } = req.body;
  try {
    const user = await User.findById(id);
    user.views.push(userId);
    await user.save();
    res.status(200).json({
      success: true,
      message: "successfully viewd",
    });
  } catch (error) {
    res.status(201).json({ success: false, message: "failed" });
  }
};

const suggested = async (req, res) => {
  const { userId } = req.body.user;
  try {
    let queryObject = {};
    queryObject._id = { $ne: userId };
    queryObject.friends = { $nin: userId };
    queryObject.verified = true;
    let QueryResult = await User.find(queryObject)
      .limit(15)
      .select("-password");
    const suggestedFriends = QueryResult;
    res.status(200).json({ data: suggestedFriends, success: true });
  } catch (error) {
    res.status(201).json({ success: false, message: "failed" });
  }
};

const searchUser = async (req, res) => {
  try {
    const { search } = req.body;
    const posts = await User.find({
      firstname: { $regex: search, $options: "i" },
    });
    res.status(200).json({
      data: posts,
      success: true,
      message: "successfully",
    });
  } catch (error) {
    res.status(201).json({ message: "fail in get post" });
  }
};

module.exports = {
  getUser,
  sendfriendRequest,
  getfriendRequest,
  acceptfriendRequest,
  profileView,
  suggested,
  updateUser,
  updateProfilePhoto,
  searchUser,
};
