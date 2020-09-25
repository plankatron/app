import ExampleAccount from EXAMPLEACCOUNTADDRESS

pub fun main() : [String] {
    let acct = getAccount(0x)
    
    let collectionRef = acct.getCapability(/public/AccountCollection)!.borrow<&{ExampleAccount.ExampleAccountStatePublic}>()
      ?? panic("Could not borrow capability from public collection")

    return [
      collectionRef.keyValueMap["name"] ?? "",
      collectionRef.keyValueMap["avatar"] ?? ""
    ]
}